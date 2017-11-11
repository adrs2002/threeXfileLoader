(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.THREE = global.THREE || {}, global.THREE.XLoader = factory());
}(this, (function () { 'use strict';

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var XboneInf = function XboneInf() {
    classCallCheck(this, XboneInf);

    this.boneName = "";
    this.BoneIndex = 0;
    this.Indeces = [];
    this.Weights = [];
    this.initMatrix = null;
    this.OffsetMatrix = null;
};

var XAnimationInfo = function XAnimationInfo() {
    classCallCheck(this, XAnimationInfo);

    this.animeName = "";
    this.boneName = "";
    this.targetBone = null;
    this.keyType = 4;
    this.frameStartLv = 0;
    this.keyFrames = [];
    this.InverseMx = null;
};

var XAnimationObj = function () {
    function XAnimationObj() {
        classCallCheck(this, XAnimationObj);

        this.fps = 30;
        this.name = 'xanimation';
        this.length = 0;
        this.hierarchy = [];
    }

    createClass(XAnimationObj, [{
        key: "make",
        value: function make(XAnimationInfoArray) {
            for (var i = 0; i < XAnimationInfoArray.length; i++) {
                this.hierarchy.push(this.makeBonekeys(XAnimationInfoArray[i]));
            }
            this.length = this.hierarchy[0].keys[this.hierarchy[0].keys.length - 1].time;
        }
    }, {
        key: "clone",
        value: function clone() {
            return Object.assign({}, this);
        }
    }, {
        key: "_make",
        value: function _make(XAnimationInfoArray, mesh) {
            var keys = Object.keys(XAnimationInfoArray);
            var hierarchy_tmp = [];
            for (var i = 0; i < keys.length; i++) {
                var bone = null;
                var parent = -1;
                var baseIndex = -1;
                for (var m = 0; m < mesh.skeleton.bones.length; m++) {
                    if (mesh.skeleton.bones[m].name == XAnimationInfoArray[keys[i]].boneName) {
                        bone = XAnimationInfoArray[keys[i]].boneName;
                        parent = mesh.skeleton.bones[m].parent.name;
                        baseIndex = m;
                        break;
                    }
                }
                hierarchy_tmp[baseIndex] = this.makeBonekeys(XAnimationInfoArray[keys[i]], bone, parent);
            }
            var keys2 = Object.keys(hierarchy_tmp);
            for (var _i = 0; _i < keys2.length; _i++) {
                this.hierarchy.push(hierarchy_tmp[_i]);
                var parentId = -1;
                for (var _m = 0; _m < this.hierarchy.length; _m++) {
                    if (_i != _m && this.hierarchy[_i].parent === this.hierarchy[_m].name) {
                        parentId = _m;
                        break;
                    }
                }
                this.hierarchy[_i].parent = parentId;
            }
        }
    }, {
        key: "makeBonekeys",
        value: function makeBonekeys(XAnimationInfo, bone, parent) {
            var refObj = {};
            refObj.name = XAnimationInfo.boneName;
            refObj.parent = "";
            refObj.keys = this.keyFrameRefactor(XAnimationInfo);
            refObj.copy = function () {
                return Object.assign({}, this);
            };
            return refObj;
        }
    }, {
        key: "keyFrameRefactor",
        value: function keyFrameRefactor(XAnimationInfo) {
            var keys = [];
            for (var i = 0; i < XAnimationInfo.keyFrames.length; i++) {
                var keyframe = {};
                keyframe.time = XAnimationInfo.keyFrames[i].time * this.fps;
                if (XAnimationInfo.keyFrames[i].pos) {
                    keyframe.pos = XAnimationInfo.keyFrames[i].pos;
                }
                if (XAnimationInfo.keyFrames[i].rot) {
                    keyframe.rot = XAnimationInfo.keyFrames[i].rot;
                }
                if (XAnimationInfo.keyFrames[i].scl) {
                    keyframe.scl = XAnimationInfo.keyFrames[i].scl;
                }
                if (XAnimationInfo.keyFrames[i].matrix) {
                    keyframe.matrix = XAnimationInfo.keyFrames[i].matrix;
                    keyframe.pos = new THREE.Vector3().setFromMatrixPosition(keyframe.matrix);
                    keyframe.rot = new THREE.Quaternion().setFromRotationMatrix(keyframe.matrix);
                    keyframe.scl = new THREE.Vector3().setFromMatrixScale(keyframe.matrix);
                }
                keys.push(keyframe);
            }
            return keys;
        }
    }]);
    return XAnimationObj;
}();

var XKeyFrameInfo = function XKeyFrameInfo() {
    classCallCheck(this, XKeyFrameInfo);

    this.index = 0;
    this.Frame = 0;
    this.time = 0.0;
    this.matrix = null;
};

"use strict";

var XLoader = function () {
    function XLoader(manager, Texloader, _zflg) {
        classCallCheck(this, XLoader);

        this.debug = false;
        this.manager = manager !== undefined ? manager : new THREE.DefaultLoadingManager();
        this.Texloader = Texloader !== undefined ? Texloader : new THREE.TextureLoader();
        this.zflg = _zflg === undefined ? false : _zflg;
        this.url = "";
        this.baseDir = "";
        this.matReadLine = 0;
        this.putMatLength = 0;
        this.nowMat = null;
        this.tmpUvArray = [];
        this.facesNormal = [];
        this.nowFrameName = "";
        this.nowAnimationSetName = "";
        this.frameHierarchie = [];
        this.Hierarchies = {};
        this.HieStack = [];
        this.currentObject = {};
        this.currentFrame = {};
        this.endLineCount = 0;
        this.lines = null;
        this.keyInfo = null;
        this.animeKeyNames = null;
        this.data = null;
        this.onLoad = null;
        this.IsUvYReverse = true;
        this.Meshes = [];
        this.Animations = [];
        this.AnimTicksPerSecond = 30;
        this.currentGeo = null;
        this.currentAnime = null;
        this.currentAnimeFrames = null;
    }

    createClass(XLoader, [{
        key: 'load',
        value: function load(_arg, onLoad, onProgress, onError) {
            var _this = this;

            var loader = new THREE.FileLoader(this.manager);
            loader.setResponseType('arraybuffer');
            for (var i = 0; i < _arg.length; i++) {
                switch (i) {
                    case 0:
                        this.url = _arg[i];
                        break;
                    case 1:
                        this.zflg = _arg[i];
                        break;
                }
            }
            loader.load(this.url, function (response) {
                _this.parse(response, onLoad);
            }, onProgress, onError);
        }
    }, {
        key: 'readLine',
        value: function readLine(line) {
            var readed = 0;
            while (true) {
                var find = -1;
                find = line.indexOf('//', readed);
                if (find === -1) {
                    find = line.indexOf('#', readed);
                }
                if (find > -1 && find < 2) {
                    var foundNewLine = -1;
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
    }, {
        key: 'isBinary',
        value: function isBinary(binData) {
            var reader = new DataView(binData);
            var face_size = 32 / 8 * 3 + 32 / 8 * 3 * 3 + 16 / 8;
            var n_faces = reader.getUint32(80, true);
            var expect = 80 + 32 / 8 + n_faces * face_size;
            if (expect === reader.byteLength) {
                return true;
            }
            var fileLength = reader.byteLength;
            for (var index = 0; index < fileLength; index++) {
                if (reader.getUint8(index, false) > 127) {
                    return true;
                }
            }
            return false;
        }
    }, {
        key: 'ensureBinary',
        value: function ensureBinary(buf) {
            if (typeof buf === "string") {
                var array_buffer = new Uint8Array(buf.length);
                for (var i = 0; i < buf.length; i++) {
                    array_buffer[i] = buf.charCodeAt(i) & 0xff;
                }
                return array_buffer.buffer || array_buffer;
            } else {
                return buf;
            }
        }
    }, {
        key: 'ensureString',
        value: function ensureString(buf) {
            if (typeof buf !== "string") {
                var array_buffer = new Uint8Array(buf);
                var str = '';
                for (var i = 0; i < buf.byteLength; i++) {
                    str += String.fromCharCode(array_buffer[i]);
                }
                return str;
            } else {
                return buf;
            }
        }
    }, {
        key: 'parse',
        value: function parse(data, onLoad) {
            var binData = this.ensureBinary(data);
            this.data = this.ensureString(data);
            this.onLoad = onLoad;
            return this.isBinary(binData) ? this.parseBinary(binData) : this.parseASCII();
        }
    }, {
        key: 'parseBinary',
        value: function parseBinary(data) {
            return parseASCII(String.fromCharCode.apply(null, data));
        }
    }, {
        key: 'parseASCII',
        value: function parseASCII() {
            if (this.url.lastIndexOf("/") > 0) {
                this.baseDir = this.url.substr(0, this.url.lastIndexOf("/") + 1);
            }
            var endRead = 16;
            this.Hierarchies.children = [];
            this.HierarchieParse(this.Hierarchies, endRead);
            this.changeRoot();
            this.currentObject = this.Hierarchies.children.shift();
            this.mainloop();
        }
    }, {
        key: 'HierarchieParse',
        value: function HierarchieParse(_parent, _end) {
            var endRead = _end;
            while (true) {
                var find1 = this.data.indexOf('{', endRead) + 1;
                var findEnd = this.data.indexOf('}', endRead);
                var findNext = this.data.indexOf('{', find1) + 1;
                if (find1 > 0 && findEnd > find1) {
                    var currentObject = {};
                    currentObject.children = [];
                    var nameData = this.readLine(this.data.substr(endRead, find1 - endRead - 1)).trim();
                    var word = nameData.split(/ /g);
                    if (word.length > 0) {
                        currentObject.type = word[0];
                        if (word.length >= 2) {
                            currentObject.name = word[1];
                        } else {
                            currentObject.name = word[0] + this.Hierarchies.children.length;
                        }
                    } else {
                        currentObject.name = nameData;
                        currentObject.type = "";
                    }
                    if (currentObject.type == "Animation") {
                        currentObject.data = this.data.substr(findNext, findEnd - findNext).trim();
                        var refs = this.HierarchieParse(currentObject, findEnd + 1);
                        endRead = refs.end;
                        currentObject.children = refs.parent.children;
                    } else {
                        var DataEnder = this.data.lastIndexOf(';', findNext > 0 ? Math.min(findNext, findEnd) : findEnd);
                        currentObject.data = this.data.substr(find1, DataEnder - find1).trim();
                        if (findNext <= 0 || findEnd < findNext) {
                            endRead = findEnd + 1;
                        } else {
                            var nextStart = Math.max(DataEnder + 1, find1);
                            var _refs = this.HierarchieParse(currentObject, nextStart);
                            endRead = _refs.end;
                            currentObject.children = _refs.parent.children;
                        }
                    }
                    currentObject.parent = _parent;
                    if (currentObject.type != "template") {
                        _parent.children.push(currentObject);
                    }
                } else {
                    endRead = find1 === -1 ? this.data.length : findEnd + 1;
                    break;
                }
            }
            return {
                parent: _parent,
                end: endRead
            };
        }
    }, {
        key: 'mainloop',
        value: function mainloop() {
            var _this2 = this;

            var timeoutFlag = this.mainProc();
            if (this.currentObject.parent || this.currentObject.children.length > 0 || !this.currentObject.worked) {
                setTimeout(function () {
                    _this2.mainloop();
                }, 1);
            } else {
                this.readFinalize();
                setTimeout(function () {
                    _this2.onLoad({
                        models: _this2.Meshes,
                        animations: _this2.Animations
                    });
                }, 1);
            }
        }
    }, {
        key: 'mainProc',
        value: function mainProc() {
            var breakFlag = false;
            while (true) {
                if (!this.currentObject.worked) {
                    switch (this.currentObject.type) {
                        case "template":
                            break;
                        case "AnimTicksPerSecond":
                            this.AnimTicksPerSecond = parseInt(this.currentObject.data);
                            break;
                        case "Frame":
                            this.setFrame();
                            break;
                        case "FrameTransformMatrix":
                            this.setFrameTransformMatrix();
                            break;
                        case "Mesh":
                            this.changeRoot();
                            this.currentGeo = {};
                            this.currentGeo.name = this.currentObject.name.trim();
                            this.currentGeo.parentName = this.getParentName(this.currentObject).trim();
                            this.currentGeo.VertexSetedBoneCount = [];
                            this.currentGeo.Geometry = new THREE.Geometry();
                            this.currentGeo.Materials = [];
                            this.currentGeo.normalVectors = [];
                            this.currentGeo.BoneInfs = [];
                            this.currentGeo.baseFrame = this.currentFrame;
                            this.makeBoneFromCurrentFrame();
                            this.readVertexDatas();
                            breakFlag = true;
                            break;
                        case "MeshNormals":
                            this.readVertexDatas();
                            break;
                        case "MeshTextureCoords":
                            this.setMeshTextureCoords();
                            break;
                        case "VertexDuplicationIndices":
                            break;
                        case "MeshMaterialList":
                            this.setMeshMaterialList();
                            break;
                        case "Material":
                            this.setMaterial();
                            break;
                        case "SkinWeights":
                            this.setSkinWeights();
                            break;
                        case "AnimationSet":
                            this.changeRoot();
                            this.currentAnime = {};
                            this.currentAnime.name = this.currentObject.name.trim();
                            this.currentAnime.AnimeFrames = [];
                            break;
                        case "Animation":
                            if (this.currentAnimeFrames) {
                                this.currentAnime.AnimeFrames.push(this.currentAnimeFrames);
                            }
                            this.currentAnimeFrames = new XAnimationInfo();
                            this.currentAnimeFrames.boneName = this.currentObject.data.trim();
                            break;
                        case "AnimationKey":
                            this.readAnimationKey();
                            breakFlag = true;
                            break;
                    }
                    this.currentObject.worked = true;
                }
                if (this.currentObject.children.length > 0) {
                    this.currentObject = this.currentObject.children.shift();
                    if (this.debug) {
                        console.log('processing ' + this.currentObject.name);
                    }
                    if (breakFlag) break;
                } else {
                    if (this.currentObject.worked) {
                        if (this.currentObject.parent && !this.currentObject.parent.parent) {
                            this.changeRoot();
                        }
                    }
                    if (this.currentObject.parent) {
                        this.currentObject = this.currentObject.parent;
                    } else {
                        breakFlag = true;
                    }
                    if (breakFlag) break;
                }
            }
            return;
        }
    }, {
        key: 'changeRoot',
        value: function changeRoot() {
            if (this.currentGeo != null && this.currentGeo.name) {
                this.MakeOutputGeometry();
            }
            this.currentGeo = {};
            if (this.currentAnime != null && this.currentAnime.name) {
                if (this.currentAnimeFrames) {
                    this.currentAnime.AnimeFrames.push(this.currentAnimeFrames);
                    this.currentAnimeFrames = null;
                }
                this.MakeOutputAnimation();
            }
            this.currentAnime = {};
        }
    }, {
        key: 'getParentName',
        value: function getParentName(_obj) {
            if (_obj.parent) {
                if (_obj.parent.name) {
                    return _obj.parent.name;
                } else {
                    return this.getParentName(_obj.parent);
                }
            } else {
                return "";
            }
        }
    }, {
        key: 'setFrame',
        value: function setFrame() {
            this.nowFrameName = this.currentObject.name.trim();
            this.currentFrame = {};
            this.currentFrame.name = this.nowFrameName;
            this.currentFrame.children = [];
            if (this.currentObject.parent && this.currentObject.parent.name) {
                this.currentFrame.parentName = this.currentObject.parent.name;
            }
            this.frameHierarchie.push(this.nowFrameName);
            this.HieStack[this.nowFrameName] = this.currentFrame;
        }
    }, {
        key: 'setFrameTransformMatrix',
        value: function setFrameTransformMatrix() {
            this.currentFrame.FrameTransformMatrix = new THREE.Matrix4();
            var data = this.currentObject.data.split(",");
            this.ParseMatrixData(this.currentFrame.FrameTransformMatrix, data);
            this.makeBoneFromCurrentFrame();
        }
    }, {
        key: 'makeBoneFromCurrentFrame',
        value: function makeBoneFromCurrentFrame() {
            var b = new THREE.Bone();
            b.name = this.currentFrame.name;
            b.applyMatrix(this.currentFrame.FrameTransformMatrix);
            b.matrixWorld = b.matrix;
            b.FrameTransformMatrix = this.currentFrame.FrameTransformMatrix;
            this.currentFrame.putBone = b;
            if (this.currentFrame.parentName) {
                for (var frame in this.HieStack) {
                    if (this.HieStack[frame].name === this.currentFrame.parentName) {
                        this.HieStack[frame].putBone.add(this.currentFrame.putBone);
                    }
                }
            }
        }
    }, {
        key: 'readVertexDatas',
        value: function readVertexDatas() {
            var endRead = 0;
            var mode = 0;
            var mode_local = 0;
            var maxLength = 0;
            var nowReadedLine = 0;
            while (true) {
                var changeMode = false;
                if (mode_local === 0) {
                    var refO = this.readInt1(endRead);
                    endRead = refO.endRead;
                    mode_local = 1;
                    nowReadedLine = 0;
                    maxLength = this.currentObject.data.indexOf(';;', endRead) + 1;
                    if (maxLength <= 0) {
                        maxLength = this.currentObject.data.length;
                    }
                } else {
                    var find = 0;
                    switch (mode) {
                        case 0:
                            find = this.currentObject.data.indexOf(',', endRead) + 1;
                            break;
                        case 1:
                            find = this.currentObject.data.indexOf(';,', endRead) + 1;
                            break;
                    }
                    if (find === 0 || find > maxLength) {
                        find = maxLength;
                        mode_local = 0;
                        changeMode = true;
                    }
                    switch (this.currentObject.type) {
                        case "Mesh":
                            switch (mode) {
                                case 0:
                                    this.readVertex1(this.currentObject.data.substr(endRead, find - endRead));
                                    break;
                                case 1:
                                    this.readFace1(this.currentObject.data.substr(endRead, find - endRead));
                                    break;
                            }
                            break;
                        case "MeshNormals":
                            switch (mode) {
                                case 0:
                                    this.readNormalVector1(this.currentObject.data.substr(endRead, find - endRead));
                                    break;
                                case 1:
                                    this.readNormalFace1(this.currentObject.data.substr(endRead, find - endRead), nowReadedLine);
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
                if (endRead >= this.currentObject.data.length) {
                    break;
                }
            }
        }
    }, {
        key: 'readInt1',
        value: function readInt1(start) {
            var find = this.currentObject.data.indexOf(';', start);
            return {
                refI: parseInt(this.currentObject.data.substr(start, find - start)),
                endRead: find + 1
            };
        }
    }, {
        key: 'readVertex1',
        value: function readVertex1(line) {
            var data = this.readLine(line.trim()).substr(0, line.length - 2).split(";");
            this.currentGeo.Geometry.vertices.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
            this.currentGeo.Geometry.skinIndices.push(new THREE.Vector4(0, 0, 0, 0));
            this.currentGeo.Geometry.skinWeights.push(new THREE.Vector4(1, 0, 0, 0));
            this.currentGeo.VertexSetedBoneCount.push(0);
        }
    }, {
        key: 'readFace1',
        value: function readFace1(line) {
            var data = this.readLine(line.trim()).substr(2, line.length - 4).split(",");
            this.currentGeo.Geometry.faces.push(new THREE.Face3(parseInt(data[0], 10), parseInt(data[1], 10), parseInt(data[2], 10), new THREE.Vector3(1, 1, 1).normalize()));
        }
    }, {
        key: 'readNormalVector1',
        value: function readNormalVector1(line) {
            var data = this.readLine(line.trim()).substr(0, line.length - 2).split(";");
            if (this.zflg) {
                this.currentGeo.normalVectors.push(new THREE.Vector3(parseFloat(data[0]) * -1, parseFloat(data[1]) * -1, parseFloat(data[2]) * -1));
            } else {
                this.currentGeo.normalVectors.push(new THREE.Vector3(parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])));
            }
        }
    }, {
        key: 'readNormalFace1',
        value: function readNormalFace1(line, nowReaded) {
            var data = this.readLine(line.trim()).substr(2, line.length - 4).split(",");
            var nowID = parseInt(data[0], 10);
            var v1 = this.currentGeo.normalVectors[nowID];
            nowID = parseInt(data[1], 10);
            var v2 = this.currentGeo.normalVectors[nowID];
            nowID = parseInt(data[2], 10);
            var v3 = this.currentGeo.normalVectors[nowID];
            this.currentGeo.Geometry.faces[nowReaded].vertexNormals = [v1, v2, v3];
        }
    }, {
        key: 'setMeshNormals',
        value: function setMeshNormals() {
            var endRead = 0;
            var mode = 0;
            var mode_local = 0;
            while (true) {
                switch (mode) {
                    case 0:
                        if (mode_local === 0) {
                            var refO = this.readInt1(0);
                            endRead = refO.endRead;
                            mode_local = 1;
                        } else {
                            var find = this.currentObject.data.indexOf(',', endRead) + 1;
                            if (find === -1) {
                                find = this.currentObject.data.indexOf(';;', endRead) + 1;
                                mode = 2;
                                mode_local = 0;
                            }
                            var line = this.currentObject.data.substr(endRead, find - endRead);
                            var data = this.readLine(line.trim()).split(";");
                            this.currentGeo.normalVectors.push([parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])]);
                            endRead = find + 1;
                        }
                        break;
                }
                if (endRead >= this.currentObject.data.length) {
                    break;
                }
            }
        }
    }, {
        key: 'setMeshTextureCoords',
        value: function setMeshTextureCoords() {
            this.tmpUvArray = [];
            this.currentGeo.Geometry.faceVertexUvs = [];
            this.currentGeo.Geometry.faceVertexUvs.push([]);
            var endRead = 0;
            var mode = 0;
            var mode_local = 0;
            while (true) {
                switch (mode) {
                    case 0:
                        if (mode_local === 0) {
                            var refO = this.readInt1(0);
                            endRead = refO.endRead;
                            mode_local = 1;
                        } else {
                            var find = this.currentObject.data.indexOf(',', endRead) + 1;
                            if (find === 0) {
                                find = this.currentObject.data.length;
                                mode = 2;
                                mode_local = 0;
                            }
                            var line = this.currentObject.data.substr(endRead, find - endRead);
                            var data = this.readLine(line.trim()).split(";");
                            if (this.IsUvYReverse) {
                                this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), 1 - parseFloat(data[1])));
                            } else {
                                this.tmpUvArray.push(new THREE.Vector2(parseFloat(data[0]), parseFloat(data[1])));
                            }
                            endRead = find + 1;
                        }
                        break;
                }
                if (endRead >= this.currentObject.data.length) {
                    break;
                }
            }
            this.currentGeo.Geometry.faceVertexUvs[0] = [];
            for (var m = 0; m < this.currentGeo.Geometry.faces.length; m++) {
                this.currentGeo.Geometry.faceVertexUvs[0][m] = [];
                this.currentGeo.Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.currentGeo.Geometry.faces[m].a]);
                this.currentGeo.Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.currentGeo.Geometry.faces[m].b]);
                this.currentGeo.Geometry.faceVertexUvs[0][m].push(this.tmpUvArray[this.currentGeo.Geometry.faces[m].c]);
            }
            this.currentGeo.Geometry.uvsNeedUpdate = true;
        }
    }, {
        key: 'setMeshMaterialList',
        value: function setMeshMaterialList() {
            var endRead = 0;
            var mode = 0;
            var mode_local = 0;
            while (true) {
                if (mode_local < 2) {
                    var refO = this.readInt1(endRead);
                    endRead = refO.endRead;
                    mode_local++;
                    
                } else {
                    var find = this.currentObject.data.indexOf(';', endRead);
                    if (find === -1) {
                        find = this.currentObject.data.length;
                        mode = 3;
                        mode_local = 0;
                    }
                    var line = this.currentObject.data.substr(endRead, find - endRead);
                    var data = this.readLine(line.trim()).split(",");
                    for (var i = 0; i < data.length; i++) {
                        this.currentGeo.Geometry.faces[i].materialIndex = parseInt(data[i]);
                    }
                    endRead = this.currentObject.data.length;
                }
                if (endRead >= this.currentObject.data.length || mode >= 3) {
                    break;
                }
            }
        }
    }, {
        key: 'setMaterial',
        value: function setMaterial() {
            var nowMat = new THREE.MeshPhongMaterial({
                color: Math.random() * 0xffffff
            });
            if (this.zflg) {
                nowMat.side = THREE.BackSide;
            } else {
                nowMat.side = THREE.FrontSide;
            }
            nowMat.name = this.currentObject.name;
            var endRead = 0;
            var find = this.currentObject.data.indexOf(';;', endRead);
            var line = this.currentObject.data.substr(endRead, find - endRead);
            var data = this.readLine(line.trim()).split(";");
            nowMat.color.r = parseFloat(data[0]);
            nowMat.color.g = parseFloat(data[1]);
            nowMat.color.b = parseFloat(data[2]);
            endRead = find + 2;
            find = this.currentObject.data.indexOf(';', endRead);
            line = this.currentObject.data.substr(endRead, find - endRead);
            nowMat.shininess = parseFloat(this.readLine(line));
            endRead = find + 1;
            find = this.currentObject.data.indexOf(';;', endRead);
            line = this.currentObject.data.substr(endRead, find - endRead);
            var data2 = this.readLine(line.trim()).split(";");
            nowMat.specular.r = parseFloat(data2[0]);
            nowMat.specular.g = parseFloat(data2[1]);
            nowMat.specular.b = parseFloat(data2[2]);
            endRead = find + 2;
            find = this.currentObject.data.indexOf(';;', endRead);
            if (find === -1) {
                find = this.currentObject.data.length;
            }
            line = this.currentObject.data.substr(endRead, find - endRead);
            var data3 = this.readLine(line.trim()).split(";");
            nowMat.emissive.r = parseFloat(data3[0]);
            nowMat.emissive.g = parseFloat(data3[1]);
            nowMat.emissive.b = parseFloat(data3[2]);
            var localObject = null;
            while (true) {
                if (this.currentObject.children.length > 0) {
                    localObject = this.currentObject.children.shift();
                    if (this.debug) {
                        console.log('processing ' + localObject.name);
                    }
                    var fileName = localObject.data.substr(1, localObject.data.length - 2);
                    switch (localObject.type) {
                        case "TextureFilename":
                            nowMat.map = this.Texloader.load(this.baseDir + fileName);
                            break;
                        case "BumpMapFilename":
                            nowMat.bumpMap = this.Texloader.load(this.baseDir + fileName);
                            nowMat.bumpScale = 0.05;
                            break;
                        case "NormalMapFilename":
                            nowMat.normalMap = this.Texloader.load(this.baseDir + fileName);
                            nowMat.normalScale = new THREE.Vector2(2, 2);
                            break;
                        case "EmissiveMapFilename":
                            nowMat.emissiveMap = this.Texloader.load(this.baseDir + fileName);
                            break;
                        case "LightMapFilename":
                            nowMat.lightMap = this.Texloader.load(this.baseDir + fileName);
                            break;
                        case "LightMapFilename":
                            nowMat.lightMap = this.Texloader.load(this.baseDir + fileName);
                            break;
                    }
                } else {
                    break;
                }
            }
            this.currentGeo.Materials.push(nowMat);
        }
    }, {
        key: 'setSkinWeights',
        value: function setSkinWeights() {
            var boneInf = new XboneInf();
            var endRead = 0;
            var find = this.currentObject.data.indexOf(';', endRead);
            var line = this.currentObject.data.substr(endRead, find - endRead);
            endRead = find + 1;
            boneInf.boneName = line.substr(1, line.length - 2);
            boneInf.BoneIndex = this.currentGeo.BoneInfs.length;
            find = this.currentObject.data.indexOf(';', endRead);
            endRead = find + 1;
            find = this.currentObject.data.indexOf(';', endRead);
            line = this.currentObject.data.substr(endRead, find - endRead);
            var data = this.readLine(line.trim()).split(",");
            for (var i = 0; i < data.length; i++) {
                boneInf.Indeces.push(parseInt(data[i]));
            }
            endRead = find + 1;
            find = this.currentObject.data.indexOf(';', endRead);
            line = this.currentObject.data.substr(endRead, find - endRead);
            var data2 = this.readLine(line.trim()).split(",");
            for (var _i = 0; _i < data2.length; _i++) {
                boneInf.Weights.push(parseFloat(data2[_i]));
            }
            endRead = find + 1;
            find = this.currentObject.data.indexOf(';', endRead);
            if (find <= 0) {
                find = this.currentObject.data.length;
            }
            line = this.currentObject.data.substr(endRead, find - endRead);
            var data3 = this.readLine(line.trim()).split(",");
            boneInf.OffsetMatrix = new THREE.Matrix4();
            this.ParseMatrixData(boneInf.OffsetMatrix, data3);
            this.currentGeo.BoneInfs.push(boneInf);
        }
    }, {
        key: 'makePutBoneList',
        value: function makePutBoneList(_RootName, _bones) {
            var putting = false;
            for (var frame in this.HieStack) {
                if (this.HieStack[frame].name === _RootName || putting) {
                    putting = true;
                    var b = new THREE.Bone();
                    b.name = this.HieStack[frame].name;
                    b.applyMatrix(this.HieStack[frame].FrameTransformMatrix);
                    b.matrixWorld = b.matrix;
                    b.FrameTransformMatrix = this.HieStack[frame].FrameTransformMatrix;
                    b.pos = new THREE.Vector3().setFromMatrixPosition(b.FrameTransformMatrix).toArray();
                    b.rotq = new THREE.Quaternion().setFromRotationMatrix(b.FrameTransformMatrix).toArray();
                    b.scl = new THREE.Vector3().setFromMatrixScale(b.FrameTransformMatrix).toArray();
                    if (this.HieStack[frame].parentName && this.HieStack[frame].parentName.length > 0) {
                        for (var i = 0; i < _bones.length; i++) {
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
    }, {
        key: 'MakeOutputGeometry',
        value: function MakeOutputGeometry() {
            this.currentGeo.Geometry.computeBoundingBox();
            this.currentGeo.Geometry.computeBoundingSphere();
            this.currentGeo.Geometry.verticesNeedUpdate = true;
            this.currentGeo.Geometry.normalsNeedUpdate = true;
            this.currentGeo.Geometry.colorsNeedUpdate = true;
            this.currentGeo.Geometry.uvsNeedUpdate = true;
            this.currentGeo.Geometry.groupsNeedUpdate = true;
            var mesh = null;
            if (this.currentGeo.BoneInfs.length > 0) {
                var putBones = [];
                this.makePutBoneList(this.currentGeo.baseFrame.parentName, putBones);
                for (var bi = 0; bi < this.currentGeo.BoneInfs.length; bi++) {
                    var boneIndex = 0;
                    for (var bb = 0; bb < putBones.length; bb++) {
                        if (putBones[bb].name === this.currentGeo.BoneInfs[bi].boneName) {
                            boneIndex = bb;
                            putBones[bb].OffsetMatrix = new THREE.Matrix4();
                            putBones[bb].OffsetMatrix.copy(this.currentGeo.BoneInfs[bi].OffsetMatrix);
                            break;
                        }
                    }
                    for (var vi = 0; vi < this.currentGeo.BoneInfs[bi].Indeces.length; vi++) {
                        var nowVertexID = this.currentGeo.BoneInfs[bi].Indeces[vi];
                        var nowVal = this.currentGeo.BoneInfs[bi].Weights[vi];
                        switch (this.currentGeo.VertexSetedBoneCount[nowVertexID]) {
                            case 0:
                                this.currentGeo.Geometry.skinIndices[nowVertexID].x = boneIndex;
                                this.currentGeo.Geometry.skinWeights[nowVertexID].x = nowVal;
                                break;
                            case 1:
                                this.currentGeo.Geometry.skinIndices[nowVertexID].y = boneIndex;
                                this.currentGeo.Geometry.skinWeights[nowVertexID].y = nowVal;
                                break;
                            case 2:
                                this.currentGeo.Geometry.skinIndices[nowVertexID].z = boneIndex;
                                this.currentGeo.Geometry.skinWeights[nowVertexID].z = nowVal;
                                break;
                            case 3:
                                this.currentGeo.Geometry.skinIndices[nowVertexID].w = boneIndex;
                                this.currentGeo.Geometry.skinWeights[nowVertexID].w = nowVal;
                                break;
                        }
                        this.currentGeo.VertexSetedBoneCount[nowVertexID]++;
                        if (this.currentGeo.VertexSetedBoneCount[nowVertexID] > 4) {
                            console.log('warn! over 4 bone weight! :' + nowVertexID);
                        }
                    }
                }
                for (var sk = 0; sk < this.currentGeo.Materials.length; sk++) {
                    this.currentGeo.Materials[sk].skinning = true;
                }
                var offsetList = [];
                for (var _bi = 0; _bi < putBones.length; _bi++) {
                    if (putBones[_bi].OffsetMatrix) {
                        offsetList.push(putBones[_bi].OffsetMatrix);
                    } else {
                        offsetList.push(new THREE.Matrix4());
                    }
                }
                var bufferGeometry = new THREE.BufferGeometry().fromGeometry(this.currentGeo.Geometry);
                bufferGeometry.bones = putBones;
                mesh = new THREE.SkinnedMesh(bufferGeometry, new THREE.MultiMaterial(this.currentGeo.Materials));
                mesh.skeleton.boneInverses = offsetList;
            } else {
                var _bufferGeometry = new THREE.BufferGeometry().fromGeometry(this.currentGeo.Geometry);
                mesh = new THREE.Mesh(_bufferGeometry, new THREE.MultiMaterial(this.currentGeo.Materials));
            }
            mesh.name = this.currentGeo.name;
            var worldBaseMx = new THREE.Matrix4();
            var currentMxFrame = this.currentGeo.baseFrame.putBone;
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
    }, {
        key: 'readAnimationKey',
        value: function readAnimationKey() {
            var endRead = 0;
            var find = this.currentObject.data.indexOf(';', endRead);
            var line = this.currentObject.data.substr(endRead, find - endRead);
            endRead = find + 1;
            var nowKeyType = parseInt(this.readLine(line));
            find = this.currentObject.data.indexOf(';', endRead);
            endRead = find + 1;
            line = this.currentObject.data.substr(endRead);
            var data = this.readLine(line.trim()).split(";;,");
            for (var i = 0; i < data.length; i++) {
                var data2 = data[i].split(";");
                var keyInfo = new XKeyFrameInfo();
                keyInfo.type = nowKeyType;
                keyInfo.Frame = parseInt(data2[0]);
                keyInfo.index = this.currentAnimeFrames.keyFrames.length;
                keyInfo.time = keyInfo.Frame;
                if (nowKeyType != 4) {
                    var frameFound = false;
                    for (var mm = 0; mm < this.currentAnimeFrames.keyFrames.length; mm++) {
                        if (this.currentAnimeFrames.keyFrames[mm].Frame === keyInfo.Frame) {
                            keyInfo = this.currentAnimeFrames.keyFrames[mm];
                            frameFound = true;
                            break;
                        }
                    }
                    var frameValue = data2[2].split(",");
                    switch (nowKeyType) {
                        case 0:
                            keyInfo.rot = new THREE.Quaternion(parseFloat(frameValue[1]), parseFloat(frameValue[2]), parseFloat(frameValue[3]), parseFloat(frameValue[0]) * -1);
                            break;
                        case 1:
                            keyInfo.scl = new THREE.Vector3(parseFloat(frameValue[0]), parseFloat(frameValue[1]), parseFloat(frameValue[2]));
                            break;
                        case 2:
                            keyInfo.pos = new THREE.Vector3(parseFloat(frameValue[0]), parseFloat(frameValue[1]), parseFloat(frameValue[2]));
                            break;
                    }
                    if (!frameFound) {
                        this.currentAnimeFrames.keyFrames.push(keyInfo);
                    }
                } else {
                    keyInfo.matrix = new THREE.Matrix4();
                    this.ParseMatrixData(keyInfo.matrix, data2[2].split(","));
                    this.currentAnimeFrames.keyFrames.push(keyInfo);
                }
            }
        }
    }, {
        key: 'MakeOutputAnimation',
        value: function MakeOutputAnimation() {
            var animationObj = new XAnimationObj();
            animationObj.fps = this.AnimTicksPerSecond;
            animationObj.name = this.currentAnime.name;
            animationObj.make(this.currentAnime.AnimeFrames);
            this.Animations.push(animationObj);
        }
    }, {
        key: 'assignAnimation',
        value: function assignAnimation(_model, _animation) {
            var model = _model;
            var animation = _animation;
            if (!model) {
                model = this.Meshes[0];
            }
            if (!animation) {
                animation = this.Animations[0];
            }
            if (!model || !animation) {
                return null;
            }
            var put = {};
            put.fps = animation.fps;
            put.name = animation.name;
            put.length = animation.length;
            put.hierarchy = [];
            for (var b = 0; b < model.skeleton.bones.length; b++) {
                var findAnimation = false;
                for (var i = 0; i < animation.hierarchy.length; i++) {
                    if (model.skeleton.bones[b].name === animation.hierarchy[i].name) {
                        findAnimation = true;
                        var c_key = animation.hierarchy[i].copy();
                        c_key.parent = -1;
                        if (model.skeleton.bones[b].parent && model.skeleton.bones[b].parent.type === "Bone") {
                            for (var bb = 0; bb < put.hierarchy.length; bb++) {
                                if (put.hierarchy[bb].name === model.skeleton.bones[b].parent.name) {
                                    c_key.parent = bb;
                                    c_key.parentName = model.skeleton.bones[b].parent.name;
                                    break;
                                }
                            }
                        }
                        put.hierarchy.push(c_key);
                        break;
                    }
                }
                if (!findAnimation) {
                    var _c_key = animation.hierarchy[0].copy();
                    _c_key.name = model.skeleton.bones[b].name;
                    _c_key.parent = -1;
                    for (var k = 0; k < _c_key.keys.length; k++) {
                        _c_key.keys[k].pos.set(0, 0, 0);
                        _c_key.keys[k].scl.set(1, 1, 1);
                        _c_key.keys[k].rot.set(0, 0, 0, 1);
                    }
                    put.hierarchy.push(_c_key);
                }
            }
            if (!model.geometry.animations) {
                model.geometry.animations = [];
            }
            model.geometry.animations.push(THREE.AnimationClip.parseAnimation(put, model.skeleton.bones));
            if (!model.animationMixer) {
                model.animationMixer = new THREE.AnimationMixer(model);
            }
            return;
        }
    }, {
        key: 'readFinalize',
        value: function readFinalize() {
            if (this.zflg) {
                for (var i = 0; i < this.Meshes.length; i++) {
                    this.Meshes[i].scale.set(-1, 1, 1);
                }
            }
        }
    }, {
        key: 'ParseMatrixData',
        value: function ParseMatrixData(targetMatrix, data) {
            targetMatrix.set(parseFloat(data[0]), parseFloat(data[4]), parseFloat(data[8]), parseFloat(data[12]), parseFloat(data[1]), parseFloat(data[5]), parseFloat(data[9]), parseFloat(data[13]), parseFloat(data[2]), parseFloat(data[6]), parseFloat(data[10]), parseFloat(data[14]), parseFloat(data[3]), parseFloat(data[7]), parseFloat(data[11]), parseFloat(data[15]));
        }
    }]);
    return XLoader;
}();

return XLoader;

})));
