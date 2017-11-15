"use strict";

/**
 * @author Jey-en  https://github.com/adrs2002
 * 
 * this loader repo -> https://github.com/adrs2002/threeXLoader
 * 
 * This loader is load model (and animation) from .X file format. (for old DirectX).
 *  ! this version are load from TEXT format .X only ! not a Binary.
 * 
 * Support
 *  - mesh
 *  - texture
 *  - normal / uv
 *  - material
 *  - skinning
 *
 *  Not Support
 *  - template
 *  - material(ditail)
 *  - morph
 *  - scene
 */

// import * as THREE from '../three.js'

import XboneInf from './parts/xBoneInf.js'
import XAnimationInfo from './parts/xAnimationInfo.js'
import XAnimationObj from './parts/XAnimationObj.js'
import XKeyFrameInfo from './parts/KeyFrameInfo.js'

export default class XLoader {
	// コンストラクタ

	/**
	 * 
	 * @param { THREE.LoadingManager } manager 
	 * @param { THREE.TextureLoader } texloader 
	 */
	constructor(manager, texloader) {

		this.debug = false;

		this.manager = (manager !== undefined) ? manager : new THREE.DefaultLoadingManager();
		this.texloader = (texloader !== undefined) ? texloader : new THREE.TextureLoader();

		this.url = "";
		this.baseDir = "";

		this._putMatLength = 0;
		this._nowMat = null;

		//UV割り出し用の一時保管配列
		this._tmpUvArray = [];

		this._facesNormal = [];

		//現在読み出し中のフレーム名称
		this._nowFrameName = "";

		//現在読み出し中のフレームの階層構造。
		this.frameHierarchie = [];
		this.Hierarchies = {};
		this.HieStack = [];
		this._currentObject = {};
		this._currentFrame = {};

		this._data = null;
		this.onLoad = null;

		this.IsUvYReverse = true;

		this.Meshes = [];
		this.animations = [];
		this.animTicksPerSecond = 30;

		this._currentGeo = null;
		this._currentAnime = null;
		this._currentAnimeFrames = null;

	}

	//読み込み開始命令部
	load(_arg, onLoad, onProgress, onError) {

		const loader = new THREE.FileLoader(this.manager);
		loader.setResponseType('arraybuffer');

		for (let i = 0; i < _arg.length; i++) {
			switch (i) {
				case 0:
					this.url = _arg[i];
					break;
				case 1:
					this.options = _arg[i];
					break;
			}
		}
		if (this.options === undefined) {
			this.options = {};
		}

		loader.load(this.url, (response) => {

			this._parse(response, onLoad);

		}, onProgress, onError);

	}

	/**
	 * コメントを外した行を取得する
	 */
	_readLine(line) {
		let readed = 0;
		while (true) {
			let find = -1;
			find = line.indexOf('//', readed);
			if (find === -1) {
				find = line.indexOf('#', readed);
			}
			if (find > -1 && find < 2) {
				let foundNewLine = -1;
				foundNewLine = line.indexOf("\r\n", readed);
				if (foundNewLine > 0) {
					readed = foundNewLine + 2;
				} else {
					foundNewLine = line.indexOf("\r", readed);
					if (foundNewLine > 0) {
						readed = foundNewLine + 1;
					} else {
						readed = line.indexOf("\n", readed) + 1;
					}
				}
			} else {
				break;
			}
		}
		return line.substr(readed);
	}

	_isBinary(binData) {

		const reader = new DataView(binData);
		const face_size = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
		const n_faces = reader.getUint32(80, true);
		const expect = 80 + (32 / 8) + (n_faces * face_size);

		if (expect === reader.byteLength) {
			return true;
		}

		// some binary files will have different size from expected,
		// checking characters higher than ASCII to confirm is binary
		const fileLength = reader.byteLength;
		for (let index = 0; index < fileLength; index++) {

			if (reader.getUint8(index, false) > 127) {

				return true;

			}
		}
		return false;
	}

	ensureBinary(buf) {

		if (typeof buf === "string") {

			const array_buffer = new Uint8Array(buf.length);
			for (let i = 0; i < buf.length; i++) {

				array_buffer[i] = buf.charCodeAt(i) & 0xff; // implicitly assumes little-endian

			}

			return array_buffer.buffer || array_buffer;

		} else {

			return buf;

		}
	}

	ensureString(buf) {

		if (typeof buf !== "string") {
			const array_buffer = new Uint8Array(buf);
			let str = '';
			for (let i = 0; i < buf.byteLength; i++) {
				str += String.fromCharCode(array_buffer[i]); // implicitly assumes little-endian
			}

			return str;

		} else {

			return buf;

		}
	}

	//解析を行う前に、バイナリファイルかテキストファイルかを判別する。今はテキストファイルしか対応できていないので・・・
	_parse(data, onLoad) {

		const binData = this.ensureBinary(data);
		this._data = this.ensureString(data);
		this.onLoad = onLoad;
		return this._isBinary(binData)
			? this._parseBinary(binData)
			: this._parseASCII();

	}

	/*
	バイナリデータだった場合の読み込み。現在は基本的に未対応
	*/
	_parseBinary(data) {
		//ねげちぶ！
		return this._parseASCII(String.fromCharCode.apply(null, data));

	}

	_parseASCII() {
		//モデルファイルの元ディレクトリを取得する
		let baseDir = "";
		if (this.url.lastIndexOf("/") > 0) {

			this.baseDir = this.url.substr(0, this.url.lastIndexOf("/") + 1);

		}

		// 返ってきたデータを行ごとに分解

		// 階層構造分解
		let added = 0;
		let endRead = 16; // 先頭16文字は固定
		this.Hierarchies.children = [];
		this._hierarchieParse(this.Hierarchies, endRead);
		this._changeRoot();
		this._currentObject = this.Hierarchies.children.shift();
		this.mainloop();

	}

	_hierarchieParse(_parent, _end) {
		let endRead = _end;
		while (true) {
			const find1 = this._data.indexOf('{', endRead) + 1;
			const findEnd = this._data.indexOf('}', endRead);
			const findNext = this._data.indexOf('{', find1) + 1;
			if (find1 > 0 && findEnd > find1) {
				const _currentObject = {};
				_currentObject.children = [];
				const nameData = this._readLine(this._data.substr(endRead, find1 - endRead - 1)).trim();

				const word = nameData.split(/ /g);
				if (word.length > 0) {
					_currentObject.type = word[0];
					if (word.length >= 2) {
						_currentObject.name = word[1];
					} else {
						_currentObject.name = word[0] + this.Hierarchies.children.length;
					}
				} else {
					_currentObject.name = nameData;
					_currentObject.type = "";
				}

				if (_currentObject.type === "Animation") {
					_currentObject.data = this._data.substr(findNext, findEnd - findNext).trim();
					const refs = this._hierarchieParse(_currentObject, findEnd + 1);
					endRead = refs.end;
					_currentObject.children = refs.parent.children;
				} else {
					const DataEnder = this._data.lastIndexOf(';', findNext > 0 ? Math.min(findNext, findEnd)
						: findEnd);
					_currentObject.data = this._data.substr(find1, DataEnder - find1).trim();
					if (findNext <= 0 || findEnd < findNext) {
						// 子階層なし。クローズ   
						endRead = findEnd + 1;
					} else {
						// 子階層あり
						const nextStart = Math.max(DataEnder + 1, find1);
						const refs = this._hierarchieParse(_currentObject, nextStart);
						endRead = refs.end;
						_currentObject.children = refs.parent.children;
					}
				}
				_currentObject.parent = _parent;
				if (_currentObject.type != "template") {
					_parent.children.push(_currentObject);
				}
			} else {
				endRead = find1 === -1 ? this._data.length : findEnd + 1;
				break;
			}
		}

		return {
			parent: _parent,
			end: endRead
		};
	}

	mainloop() {

		this.mainProc();
		if (this._currentObject.parent || this._currentObject.children.length > 0 || !this._currentObject
			.worked) {
			// this._currentObject = this._currentObject.parent;
			setTimeout(() => {
				this.mainloop();
			}, 1);
		} else {
			this._readFinalize();
			setTimeout(() => {
				this.onLoad({
					models: this.Meshes,
					animations: this.animations
				})
			}, 1);
		}
	}

	mainProc() {
		let breakFlag = false;
		while (true) {
			if (!this._currentObject.worked) {
				switch (this._currentObject.type) {
					case "template":
						break;

					case "AnimTicksPerSecond":
						this.animTicksPerSecond = parseInt(this._currentObject.data);
						break;

					case "Frame":
						this._setFrame();
						break;

					case "FrameTransformMatrix":
						this._setFrameTransformMatrix();
						break;

					case "Mesh":
						this._changeRoot();
						this._currentGeo = {};
						this._currentGeo.name = this._currentObject.name.trim();
						this._currentGeo.parentName = this._getParentName(this._currentObject).trim();
						this._currentGeo.VertexSetedBoneCount = [];
						this._currentGeo.Geometry = new THREE.Geometry();
						this._currentGeo.Materials = [];
						this._currentGeo.normalVectors = [];
						this._currentGeo.BoneInfs = [];
						// putBones = [];
						this._currentGeo.baseFrame = this._currentFrame;
						this._makeBoneFrom_CurrentFrame();
						this._readVertexDatas();
						breakFlag = true;
						break;

					case "MeshNormals":
						this._readVertexDatas();
						break;

					case "MeshTextureCoords":
						this._setMeshTextureCoords();
						break;

					case "VertexDuplicationIndices":
						//イラネ
						break;

					case "MeshMaterialList":
						this._setMeshMaterialList();
						break;

					case "Material":
						this._setMaterial();
						break;

					case "SkinWeights":
						this._setSkinWeights();
						break;

					case "AnimationSet":
						this._changeRoot();
						this._currentAnime = {};
						this._currentAnime.name = this._currentObject.name.trim();
						this._currentAnime.AnimeFrames = [];
						break;

					case "Animation":
						if (this._currentAnimeFrames) {
							this._currentAnime.AnimeFrames.push(this._currentAnimeFrames);
						}
						this._currentAnimeFrames = new XAnimationInfo();
						this._currentAnimeFrames.boneName = this._currentObject.data.trim();
						break;

					case "AnimationKey":
						this._readAnimationKey();
						breakFlag = true;
						break;
				}
				this._currentObject.worked = true;
			}

			if (this._currentObject.children.length > 0) {
				this._currentObject = this._currentObject.children.shift();
				if (this.debug) {
					console.log('processing ' + this._currentObject.name);
				}
				if (breakFlag) break;
			} else {
				// ルート＝親が１つだけの場合
				if (this._currentObject.worked) {
					if (this._currentObject.type === "Mesh" || this._currentObject.type === "AnimationSet") {
						// this._changeRoot();
					}

					if (this._currentObject.parent && !this._currentObject.parent.parent) {
						this._changeRoot();
					}
				}

				if (this._currentObject.parent) {
					this._currentObject = this._currentObject.parent;
				} else {
					breakFlag = true;
				}
				if (breakFlag) break;
			}
		}
		return;
	}

	_changeRoot() {

		if (this._currentGeo != null && this._currentGeo.name) {
			this._makeOutputGeometry();
		}
		this._currentGeo = {};
		if (this._currentAnime != null && this._currentAnime.name) {
			if (this._currentAnimeFrames) {
				this._currentAnime.AnimeFrames.push(this._currentAnimeFrames);
				this._currentAnimeFrames = null;
			}
			this._makeOutputAnimation();
		}
		this._currentAnime = {};
	}

	_getParentName(_obj) {
		if (_obj.parent) {
			if (_obj.parent.name) {
				return _obj.parent.name;
			} else {
				return this._getParentName(_obj.parent);
			}
		} else {
			return "";
		}
	}

	_setFrame() {
		this._nowFrameName = this._currentObject.name.trim();
		this._currentFrame = {};
		this._currentFrame.name = this._nowFrameName;
		this._currentFrame.children = [];

		if (this._currentObject.parent && this._currentObject.parent.name) {
			this._currentFrame.parentName = this._currentObject.parent.name;
		}
		this.frameHierarchie.push(this._nowFrameName);
		this.HieStack[this._nowFrameName] = this._currentFrame;
	}

	_setFrameTransformMatrix() {
		this._currentFrame.FrameTransformMatrix = new THREE.Matrix4();
		const data = this._currentObject.data.split(",");
		this._ParseMatrixData(this._currentFrame.FrameTransformMatrix, data);
		this._makeBoneFrom_CurrentFrame();
	}

	_makeBoneFrom_CurrentFrame() {
		const b = new THREE.Bone();
		b.name = this._currentFrame.name;
		b.applyMatrix(this._currentFrame.FrameTransformMatrix);
		b.matrixWorld = b.matrix;
		b.FrameTransformMatrix = this._currentFrame.FrameTransformMatrix;
		this._currentFrame.putBone = b;

		if (this._currentFrame.parentName) {
			for (var frame in this.HieStack) {
				if (this.HieStack[frame].name === this._currentFrame.parentName) {
					this.HieStack[frame].putBone.add(this._currentFrame.putBone);
				}
			}
		}

	}

	_readVertexDatas() {

		// 1行目は総頂点数。
		let endRead = 0;
		let totalV = 0;
		let totalFace = 0;
		let mode = 0;
		let mode_local = 0
		let maxLength = 0;
		let nowReadedLine = 0;
		while (true) {
			let changeMode = false;
			if (mode_local === 0) {
				const refO = this._readInt1(endRead);
				totalV = refO.refI;
				endRead = refO.endRead;
				mode_local = 1;
				nowReadedLine = 0;
				maxLength = this._currentObject.data.indexOf(';;', endRead) + 1;
				if (maxLength <= 0) {
					maxLength = this._currentObject.data.length
				}
			} else {
				let find = 0;
				switch (mode) {
					case 0:
						find = this._currentObject.data.indexOf(',', endRead) + 1;
						break;
					case 1:
						find = this._currentObject.data.indexOf(';,', endRead) + 1;
						break;
				}

				if (find === 0 || find > maxLength) {
					find = maxLength;
					mode_local = 0;
					changeMode = true;
				}

				switch (this._currentObject.type) {
					case "Mesh":
						switch (mode) {
							case 0:
								this._readVertex1(this._currentObject.data.substr(endRead, find - endRead));
								break;
							case 1:
								this._readFace1(this._currentObject.data.substr(endRead, find - endRead));
								break;
						}
						break;

					case "MeshNormals":
						switch (mode) {
							case 0:
								this._readNormalVector1(this._currentObject.data.substr(endRead, find - endRead));
								break;
							case 1:
								this._readNormalFace1(this._currentObject.data.substr(endRead, find - endRead),
									nowReadedLine);
								break;
						}
						break;
				}
				endRead = find + 1;
				nowReadedLine++;
				if (changeMode) {
					mode++;
				}
			}
			if (endRead >= this._currentObject.data.length) {
				break;
			}
		}
	}

	_readInt1(start) {
		const find = this._currentObject.data.indexOf(';', start);
		return {
			refI: parseInt(this._currentObject.data.substr(start, find - start)),
			endRead: find + 1
		};
	}

	_readVertex1(line) {
		//頂点が確定
		const data = this._readLine(line.trim()).substr(0, line.length - 2).split(";");
		this._currentGeo.Geometry.vertices.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
		//頂点を作りながら、Skin用構造も作成してしまおう
		this._currentGeo.Geometry.skinIndices.push(new THREE.Vector4(0, 0, 0, 0));
		this._currentGeo.Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
		this._currentGeo.VertexSetedBoneCount.push(0);
	}

	_readFace1(line) {
		// 面に属する頂点数,頂点の配列内index という形で入っている
		const data = this._readLine(line.trim()).substr(2, line.length - 4).split(",");
		this._currentGeo.Geometry.faces.push(new THREE.Face3(parseInt(data[0], 10), parseInt(data[1],
			10), parseInt(data[2], 10), new THREE.Vector3(1, 1, 1).normalize()));
	}

	_readNormalVector1(line) {
		const data = this._readLine(line.trim()).substr(0, line.length - 2).split(";");
		if (this.options.zflag) {
			this._currentGeo.normalVectors.push(new THREE.Vector3(parseFloat(data[0]) * -1,
				parseFloat(data[1]) * -1, parseFloat(data[2]) * -1));
		} else {
			this._currentGeo.normalVectors.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(
				data[1]), parseFloat(data[2])));
		}
	}

	_readNormalFace1(line, nowReaded) {

		const data = this._readLine(line.trim()).substr(2, line.length - 4).split(",");

		let nowID = parseInt(data[0], 10);
		const v1 = this._currentGeo.normalVectors[nowID];
		nowID = parseInt(data[1], 10);
		const v2 = this._currentGeo.normalVectors[nowID];
		nowID = parseInt(data[2], 10);
		const v3 = this._currentGeo.normalVectors[nowID];

		this._currentGeo.Geometry.faces[nowReaded].vertexNormals = [v1, v2, v3];

	}

	_setMeshNormals() {
		let endRead = 0;
		let totalV = 0;
		let totalFace = 0;
		let mode = 0;
		let mode_local = 0
		while (true) {
			switch (mode) {
				case 0: //vertex
					if (mode_local === 0) {
						const refO = this._readInt1(0);
						totalV = refO.refI;
						endRead = refO.endRead;
						mode_local = 1;
					} else {
						let find = this._currentObject.data.indexOf(',', endRead) + 1;
						if (find === -1) {
							find = this._currentObject.data.indexOf(';;', endRead) + 1;
							mode = 2;
							mode_local = 0;
						}
						const line = this._currentObject.data.substr(endRead, find - endRead);
						const data = this._readLine(line.trim()).split(";");
						this._currentGeo.normalVectors.push([parseFloat(data[0]), parseFloat(data[1]),
							parseFloat(data[2])
						]);
						endRead = find + 1;
					}
					break;
			}
			if (endRead >= this._currentObject.data.length) {
				break;
			}
		}
	}

	_setMeshTextureCoords() {
		this._tmpUvArray = [];
		this._currentGeo.Geometry.faceVertexUvs = [];
		this._currentGeo.Geometry.faceVertexUvs.push([]);

		let endRead = 0;
		let totalV = 0;
		let totalFace = 0;
		let mode = 0;
		let mode_local = 0
		while (true) {
			switch (mode) {
				case 0: //vertex
					if (mode_local === 0) {
						const refO = this._readInt1(0);
						totalV = refO.refI;
						endRead = refO.endRead;
						mode_local = 1;
					} else {
						let find = this._currentObject.data.indexOf(',', endRead) + 1;
						if (find === 0) {
							find = this._currentObject.data.length;
							mode = 2;
							mode_local = 0;
						}
						const line = this._currentObject.data.substr(endRead, find - endRead);
						const data = this._readLine(line.trim()).split(";");
						if (this.IsUvYReverse) {
							this._tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), 1 - parseFloat(data[
								1])));
						} else {
							this._tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), parseFloat(data[1])));
						}
						endRead = find + 1;
					}
					break;
			}
			if (endRead >= this._currentObject.data.length) {
				break;
			}
		}
		//UV読み込み完了。メッシュにUVを割り当てる
		this._currentGeo.Geometry.faceVertexUvs[0] = [];
		for (var m = 0; m < this._currentGeo.Geometry.faces.length; m++) {
			this._currentGeo.Geometry.faceVertexUvs[0][m] = [];
			this._currentGeo.Geometry.faceVertexUvs[0][m].push(this._tmpUvArray[this._currentGeo.Geometry
				.faces[m].a]);
			this._currentGeo.Geometry.faceVertexUvs[0][m].push(this._tmpUvArray[this._currentGeo.Geometry
				.faces[m].b]);
			this._currentGeo.Geometry.faceVertexUvs[0][m].push(this._tmpUvArray[this._currentGeo.Geometry
				.faces[m].c]);

		}
		this._currentGeo.Geometry.uvsNeedUpdate = true;
	}

	_setMeshMaterialList() {
		let endRead = 0;
		let mode = 0;
		let mode_local = 0;
		let readCount = 0;
		while (true) {
			if (mode_local < 2) {
				const refO = this._readInt1(endRead);
				endRead = refO.endRead;
				mode_local++;
				readCount = 0;
			} else {
				let find = this._currentObject.data.indexOf(';', endRead);
				if (find === -1) {
					find = this._currentObject.data.length;
					mode = 3;
					mode_local = 0;
				}
				const line = this._currentObject.data.substr(endRead, find - endRead);
				const data = this._readLine(line.trim()).split(",");
				for (let i = 0; i < data.length; i++) {
					this._currentGeo.Geometry.faces[i].materialIndex = parseInt(data[i]);
				}
				endRead = this._currentObject.data.length;
			}
			if (endRead >= this._currentObject.data.length || mode >= 3) {
				break;
			}
		}
	}

	_setMaterial() {
		const _nowMat = new THREE.MeshPhongMaterial({
			color: Math.random() * 0xffffff
		});

		if (this.options.zflag) {
			_nowMat.side = THREE.BackSide;
		} else {
			_nowMat.side = THREE.FrontSide;
		}

		_nowMat.name = this._currentObject.name;

		let endRead = 0;
		// １つめの[;;]まで＝Diffuse
		let find = this._currentObject.data.indexOf(';;', endRead);
		let line = this._currentObject.data.substr(endRead, find - endRead);
		const data = this._readLine(line.trim()).split(";");
		_nowMat.color.r = parseFloat(data[0]);
		_nowMat.color.g = parseFloat(data[1]);
		_nowMat.color.b = parseFloat(data[2]);

		// 次の [;]まで＝反射率
		endRead = find + 2;
		find = this._currentObject.data.indexOf(';', endRead);
		line = this._currentObject.data.substr(endRead, find - endRead);
		_nowMat.shininess = parseFloat(this._readLine(line));

		// 次の[;;]まで＝反射光？
		endRead = find + 1;
		find = this._currentObject.data.indexOf(';;', endRead);
		line = this._currentObject.data.substr(endRead, find - endRead);
		const data2 = this._readLine(line.trim()).split(";");
		_nowMat.specular.r = parseFloat(data2[0]);
		_nowMat.specular.g = parseFloat(data2[1]);
		_nowMat.specular.b = parseFloat(data2[2]);

		// 次の [;]まで＝発光色?
		endRead = find + 2;
		find = this._currentObject.data.indexOf(';;', endRead);
		if (find === -1) {
			find = this._currentObject.data.length;
		}
		line = this._currentObject.data.substr(endRead, find - endRead);
		const data3 = this._readLine(line.trim()).split(";");
		_nowMat.emissive.r = parseFloat(data3[0]);
		_nowMat.emissive.g = parseFloat(data3[1]);
		_nowMat.emissive.b = parseFloat(data3[2]);

		// 子階層処理
		let localObject = null;
		while (true) {
			if (this._currentObject.children.length > 0) {
				localObject = this._currentObject.children.shift();
				if (this.debug) {
					console.log('processing ' + localObject.name);
				}
				const fileName = localObject.data.substr(1, localObject.data.length - 2);
				switch (localObject.type) {
					case "TextureFilename":
						_nowMat.map = this.texloader.load(this.baseDir + fileName);
						break;
					case "BumpMapFilename":
						_nowMat.bumpMap = this.texloader.load(this.baseDir + fileName);
						_nowMat.bumpScale = 0.05;
						break;
					case "NormalMapFilename":
						_nowMat.normalMap = this.texloader.load(this.baseDir + fileName);
						_nowMat.normalScale = new THREE.Vector2(2, 2);
						break;
					case "EmissiveMapFilename":
						_nowMat.emissiveMap = this.texloader.load(this.baseDir + fileName);
						break;
					case "LightMapFilename":
						_nowMat.lightMap = this.texloader.load(this.baseDir + fileName);
						break;

						// _nowMat.envMap = this.texloader.load(this.baseDir + data);
				}
			} else {
				break;
			}
		}

		this._currentGeo.Materials.push(_nowMat);
	}

	_setSkinWeights() {
		const boneInf = new XboneInf();

		let endRead = 0;
		// １つめの[;]まで＝name
		let find = this._currentObject.data.indexOf(';', endRead);
		let line = this._currentObject.data.substr(endRead, find - endRead);
		endRead = find + 1;

		boneInf.boneName = line.substr(1, line.length - 2);
		boneInf.BoneIndex = this._currentGeo.BoneInfs.length;

		// ボーンに属する頂点数。今はいらない
		find = this._currentObject.data.indexOf(';', endRead);
		endRead = find + 1;

		// 次の[;]まで：このボーンに属する頂点Index
		find = this._currentObject.data.indexOf(';', endRead);
		line = this._currentObject.data.substr(endRead, find - endRead);
		const data = this._readLine(line.trim()).split(",");
		for (let i = 0; i < data.length; i++) {
			boneInf.Indeces.push(parseInt(data[i]));
		}
		endRead = find + 1;
		//  次の[;]まで：それぞれの頂点に対するweight
		find = this._currentObject.data.indexOf(';', endRead);
		line = this._currentObject.data.substr(endRead, find - endRead);
		const data2 = this._readLine(line.trim()).split(",");
		for (let i = 0; i < data2.length; i++) {
			boneInf.Weights.push(parseFloat(data2[i]));
		}
		endRead = find + 1;
		// 次の[;] or 最後まで：ini matrix
		find = this._currentObject.data.indexOf(';', endRead);
		if (find <= 0) {
			find = this._currentObject.data.length;
		}
		line = this._currentObject.data.substr(endRead, find - endRead);
		const data3 = this._readLine(line.trim()).split(",");

		//boneInf.initMatrix = new THREE.Matrix4();
		//this._ParseMatrixData(boneInf.initMatrix, data3);

		boneInf.OffsetMatrix = new THREE.Matrix4();
		this._ParseMatrixData(boneInf.OffsetMatrix, data3);
		// boneInf.OffsetMatrix.getInverse(boneInf.initMatrix);

		this._currentGeo.BoneInfs.push(boneInf);

	}

	_makePutBoneList(_RootName, _bones) {
		let putting = false;
		for (var frame in this.HieStack) {
			if (this.HieStack[frame].name === _RootName || putting) {
				putting = true;
				const b = new THREE.Bone();
				b.name = this.HieStack[frame].name;
				b.applyMatrix(this.HieStack[frame].FrameTransformMatrix);
				b.matrixWorld = b.matrix;
				b.FrameTransformMatrix = this.HieStack[frame].FrameTransformMatrix;
				b.pos = new THREE.Vector3().setFromMatrixPosition(b.FrameTransformMatrix).toArray();
				b.rotq = new THREE.Quaternion().setFromRotationMatrix(b.FrameTransformMatrix).toArray();
				b.scl = new THREE.Vector3().setFromMatrixScale(b.FrameTransformMatrix).toArray();

				if (this.HieStack[frame].parentName && this.HieStack[frame].parentName.length > 0) {
					for (let i = 0; i < _bones.length; i++) {
						if (this.HieStack[frame].parentName === _bones[i].name) {
							_bones[i].add(b);
							b.parent = i;
							break;
						}
					}
				}
				_bones.push(b);
			}
		}
	}

	_makeOutputGeometry() {

		//１つのmesh終了
		this._currentGeo.Geometry.computeBoundingBox();
		this._currentGeo.Geometry.computeBoundingSphere();

		this._currentGeo.Geometry.verticesNeedUpdate = true;
		this._currentGeo.Geometry.normalsNeedUpdate = true;
		this._currentGeo.Geometry.colorsNeedUpdate = true;
		this._currentGeo.Geometry.uvsNeedUpdate = true;
		this._currentGeo.Geometry.groupsNeedUpdate = true;

		//ボーンの階層構造を作成する

		let mesh = null;

		if (this._currentGeo.BoneInfs.length > 0) {
			const putBones = [];
			this._makePutBoneList(this._currentGeo.baseFrame.parentName, putBones);
			//さらに、ウェイトとボーン情報を紐付ける
			for (let bi = 0; bi < this._currentGeo.BoneInfs.length; bi++) {
				// ズレているskinWeightのボーンと、頂点のないボーン情報とのすり合わせ
				let boneIndex = 0;
				for (let bb = 0; bb < putBones.length; bb++) {
					if (putBones[bb].name === this._currentGeo.BoneInfs[bi].boneName) {
						boneIndex = bb;
						putBones[bb].OffsetMatrix = new THREE.Matrix4();
						putBones[bb].OffsetMatrix.copy(this._currentGeo.BoneInfs[bi].OffsetMatrix);
						break;
					}
				}

				//ウェイトのあるボーンであることが確定。頂点情報を割り当てる
				for (let vi = 0; vi < this._currentGeo.BoneInfs[bi].Indeces.length; vi++) {
					//頂点へ割り当て
					const nowVertexID = this._currentGeo.BoneInfs[bi].Indeces[vi];
					const nowVal = this._currentGeo.BoneInfs[bi].Weights[vi];

					switch (this._currentGeo.VertexSetedBoneCount[nowVertexID]) {
						case 0:
							this._currentGeo.Geometry.skinIndices[nowVertexID].x = boneIndex;
							this._currentGeo.Geometry.skinWeights[nowVertexID].x = nowVal;
							break;

						case 1:
							this._currentGeo.Geometry.skinIndices[nowVertexID].y = boneIndex;
							this._currentGeo.Geometry.skinWeights[nowVertexID].y = nowVal;
							break;
						case 2:
							this._currentGeo.Geometry.skinIndices[nowVertexID].z = boneIndex;
							this._currentGeo.Geometry.skinWeights[nowVertexID].z = nowVal;
							break;
						case 3:
							this._currentGeo.Geometry.skinIndices[nowVertexID].w = boneIndex;
							this._currentGeo.Geometry.skinWeights[nowVertexID].w = nowVal;
							break;

					}
					this._currentGeo.VertexSetedBoneCount[nowVertexID]++;
					if (this._currentGeo.VertexSetedBoneCount[nowVertexID] > 4) {
						console.log('warn! over 4 bone weight! :' + nowVertexID);
					}
				}
			}

			for (let sk = 0; sk < this._currentGeo.Materials.length; sk++) {
				this._currentGeo.Materials[sk].skinning = true;
			}

			const offsetList = [];
			for (let bi = 0; bi < putBones.length; bi++) {
				if (putBones[bi].OffsetMatrix) {
					offsetList.push(putBones[bi].OffsetMatrix);
				} else {
					offsetList.push(new THREE.Matrix4());
				}
			}

			const bufferGeometry = new THREE.BufferGeometry().fromGeometry(this._currentGeo.Geometry);
			bufferGeometry.bones = putBones;
			mesh = new THREE.SkinnedMesh(bufferGeometry, new THREE.MultiMaterial(this._currentGeo.Materials));
			mesh.skeleton.boneInverses = offsetList;
		} else {

			const bufferGeometry = new THREE.BufferGeometry().fromGeometry(this._currentGeo.Geometry);
			mesh = new THREE.Mesh(bufferGeometry, new THREE.MultiMaterial(this._currentGeo.Materials));
		}

		mesh.name = this._currentGeo.name;

		// ボーンが属すよりさらに上の階層のframeMatrixがあれば、割り当てる
		const worldBaseMx = new THREE.Matrix4();
		let currentMxFrame = this._currentGeo.baseFrame.putBone;
		if (currentMxFrame.parent) {
			while (true) {
				currentMxFrame = currentMxFrame.parent;
				if (currentMxFrame) {
					worldBaseMx.multiply(currentMxFrame.FrameTransformMatrix);
				} else {
					break;
				}
			}
		}
		mesh.applyMatrix(worldBaseMx);
		this.Meshes.push(mesh);
	}

	_readAnimationKey() {

		let endRead = 0;
		// １つめの[;]まで＝keyType
		let find = this._currentObject.data.indexOf(';', endRead);
		let line = this._currentObject.data.substr(endRead, find - endRead);
		endRead = find + 1;

		let nowKeyType = parseInt(this._readLine(line));
		// 2つめの[;]まで＝キー数。スルー
		find = this._currentObject.data.indexOf(';', endRead);
		endRead = find + 1;
		// 本番 [;;,] で1キーとなる
		line = this._currentObject.data.substr(endRead);
		const data = this._readLine(line.trim()).split(";;,");
		for (let i = 0; i < data.length; i++) {
			//内部。さらに[;]でデータが分かれる
			const data2 = data[i].split(";");

			let keyInfo = new XKeyFrameInfo();
			keyInfo.type = nowKeyType;
			keyInfo.Frame = parseInt(data2[0]);
			keyInfo.index = this._currentAnimeFrames.keyFrames.length;
			keyInfo.time = keyInfo.Frame;

			//すでにそのキーが宣言済みでないかどうかを探す
			//要素によるキー飛ばし（回転：0&20フレーム、　移動:0&10&20フレーム　で、10フレーム時に回転キーがない等 )には対応できていない
			if (nowKeyType != 4) {
				let frameFound = false;
				for (var mm = 0; mm < this._currentAnimeFrames.keyFrames.length; mm++) {
					if (this._currentAnimeFrames.keyFrames[mm].Frame === keyInfo.Frame) {
						keyInfo = this._currentAnimeFrames.keyFrames[mm];
						frameFound = true;
						break;
					}
				}
				const frameValue = data2[2].split(",");
				//const frameM = new THREE.Matrix4();
				switch (nowKeyType) {

					case 0:
						keyInfo.rot = new THREE.Quaternion(parseFloat(frameValue[1]), parseFloat(frameValue[
							2]), parseFloat(frameValue[3]), parseFloat(frameValue[0]) * -1);
						// frameM.makeRotationFromQuaternion(new THREE.Quaternion(parseFloat(frameValue[1]), parseFloat(frameValue[2]), parseFloat(frameValue[3]), parseFloat(frameValue[0])));
						//keyInfo.matrix.multiply(frameM);
						break;
					case 1:
						keyInfo.scl = new THREE.Vector3(parseFloat(frameValue[0]), parseFloat(frameValue[1]),
							parseFloat(frameValue[2]));
						// frameM.makeScale(parseFloat(frameValue[0]), parseFloat(frameValue[1]), parseFloat(frameValue[2]));
						//keyInfo.matrix.multiply(frameM);
						break;
					case 2:
						keyInfo.pos = new THREE.Vector3(parseFloat(frameValue[0]), parseFloat(frameValue[1]),
							parseFloat(frameValue[2]));
						//frameM.makeTranslation(parseFloat(frameValue[0]), parseFloat(frameValue[1]), parseFloat(frameValue[2]));
						//keyInfo.matrix.multiply(frameM);
						break;
						//case 3: this.keyInfo.matrix.makeScale(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])); break;

				}

				if (!frameFound) {
					this._currentAnimeFrames.keyFrames.push(keyInfo);
				}
			} else {
				keyInfo.matrix = new THREE.Matrix4();
				this._ParseMatrixData(keyInfo.matrix, data2[2].split(","));
				this._currentAnimeFrames.keyFrames.push(keyInfo);
			}
		}

	}

	_makeOutputAnimation() {
		const animationObj = new XAnimationObj(this.options);
		animationObj.fps = this.animTicksPerSecond;
		animationObj.name = this._currentAnime.name;
		animationObj.make(this._currentAnime.AnimeFrames);
		this.animations.push(animationObj);
	}

	/**
	 * モデルにアニメーションを割り当てます。
	 * @param { THREE.Mesh } _model 
	 * @param { XAnimationObj } _animation
	 * @param { bool  } _isBind 
	 */
	assignAnimation(_model, _animation, _isBind) {
		let model = _model;
		let animation = _animation;
		let bindFlag = _isBind ? _isBind : true;
		if (!model) {
			model = this.Meshes[0];
		}
		if (!animation) {
			animation = this.animations[0];
		}
		if (!model || !animation) {
			return null;
		}

		const put = {};
		put.fps = animation.fps;
		put.name = animation.name;
		put.length = animation.length;
		put.hierarchy = [];
		for (let b = 0; b < model.skeleton.bones.length; b++) {
			let findAnimation = false;
			for (let i = 0; i < animation.hierarchy.length; i++) {
				if (model.skeleton.bones[b].name === animation.hierarchy[i].name) {
					findAnimation = true;
					const c_key = animation.hierarchy[i].copy();
					c_key.parent = -1;
					if (model.skeleton.bones[b].parent && model.skeleton.bones[b].parent.type === "Bone") {
						for (let bb = 0; bb < put.hierarchy.length; bb++) {
							if (put.hierarchy[bb].name === model.skeleton.bones[b].parent.name) {
								c_key.parent = bb;
								c_key.parentName = model.skeleton.bones[b].parent.name;
							}
						}
					}

					put.hierarchy.push(c_key);
					break;
				}
			}
			if (!findAnimation) {
				// キーだけダミーでコピー
				const c_key = animation.hierarchy[0].copy();
				c_key.name = model.skeleton.bones[b].name;
				c_key.parent = -1;
				for (let k = 0; k < c_key.keys.length; k++) {
					if (c_key.keys[k].pos) {
						c_key.keys[k].pos.set(0, 0, 0);
					}
					if (c_key.keys[k].scl) {
						c_key.keys[k].scl.set(1, 1, 1);
					}
					if (c_key.keys[k].rot) {
						c_key.keys[k].rot.set(0, 0, 0, 1);
					}
				}
				put.hierarchy.push(c_key);
			}
		}

		if (!model.geometry.animations) {
			model.geometry.animations = [];
		}
		if (bindFlag) {
			model.geometry.animations.push(THREE.AnimationClip.parseAnimation(put, model.skeleton.bones));
			if (!model.animationMixer) {
				model.animationMixer = new THREE.AnimationMixer(model);
			}
		}

		return put;
	}

	_readFinalize() {
		//アニメーション情報、ボーン構造などを再構築
		//一部ソフトウェアからの出力用（DirectXとOpenGLのZ座標系の違い）に、鏡面処理を行う
		if (this.options.zflag) {
			for (let i = 0; i < this.Meshes.length; i++) {
				this.Meshes[i].scale.set(-1, 1, 1);
			}
		}
	}

	///

	/////////////////////////////////
	_ParseMatrixData(targetMatrix, data) {

		targetMatrix.set(
			parseFloat(data[0]), parseFloat(data[4]), parseFloat(data[8]), parseFloat(data[12]),
			parseFloat(data[1]), parseFloat(data[5]), parseFloat(data[9]), parseFloat(data[13]),
			parseFloat(data[2]), parseFloat(data[6]), parseFloat(data[10]), parseFloat(data[14]),
			parseFloat(data[3]), parseFloat(data[7]), parseFloat(data[11]), parseFloat(data[15]));

	}

};
