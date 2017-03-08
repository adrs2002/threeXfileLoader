// import * as XAnimationInfo from 'XAnimationInfo.js'
// import * as _xdata from 'rawXdata.js'

export default class XAnimationObj {
    constructor() {
        this.fps = 30;
        this.name = 'xanimation';
        this.length = 0;
        this.hierarchy = [];
    }

    make(XAnimationInfoArray, mesh) {
        const keys = Object.keys(XAnimationInfoArray);
        const hierarchy_tmp = [];
        for (let i = 0; i < keys.length; i++) {
            let bone = null;
            let parent = -1;
            let baseIndex = -1;
            //まず、割り当てられているボーンを探す
            for (let m = 0; m < mesh.skeleton.bones.length; m++) {
                if (mesh.skeleton.bones[m].name == XAnimationInfoArray[keys[i]].BoneName) {
                    bone = XAnimationInfoArray[keys[i]].BoneName;
                    parent = mesh.skeleton.bones[m].parent.name;
                    baseIndex = m;
                    break;
                }
            }
            hierarchy_tmp[baseIndex] = this.makeBonekeys(XAnimationInfoArray[keys[i]], bone, parent);
        }
        //Xfileの仕様で、「ボーンの順番どおりにアニメーションが出てる」との保証がないため、ボーンヒエラルキーは再定義
        const keys2 = Object.keys(hierarchy_tmp);
        for (let i = 0; i < keys2.length; i++) {
            this.hierarchy.push(hierarchy_tmp[i]);
            //こんどは、自分より先に「親」がいるはず。
            let parentId = -1;
            for (let m = 0; m < this.hierarchy.length; m++) {
                if (i != m && this.hierarchy[i].parent === this.hierarchy[m].name) {
                    parentId = m;
                    break;
                }
            }
            this.hierarchy[i].parent = parentId;
        }
    }

    //ボーンとキーフレームを再作成する
    makeBonekeys(XAnimationInfo, bone, parent) {
        const refObj = new Object();
        refObj.name = bone;
        refObj.parent = parent;
        refObj.keys = new Array();
        for (let i = 0; i < XAnimationInfo.KeyFrames.length; i++) {
            const keyframe = new Object();
            keyframe.time = XAnimationInfo.KeyFrames[i].time * this.fps;
            keyframe.matrix = XAnimationInfo.KeyFrames[i].matrix;
            // matrixを再分解。
            keyframe.pos = new THREE.Vector3().setFromMatrixPosition(keyframe.matrix);
            keyframe.rot = new THREE.Quaternion().setFromRotationMatrix(keyframe.matrix);
            keyframe.scl = new THREE.Vector3().setFromMatrixScale(keyframe.matrix);
            refObj.keys.push(keyframe);
        }
        return refObj;
    }

}
