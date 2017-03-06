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
        for (let i = 0; i < keys.length; i++) {
            let bone = null;
            let parent = -1;
            //まず、割り当てられているボーンを探す
            for (let m = 0; m < mesh.skeleton.bones.length; m++) {
                if (mesh.skeleton.bones[m].name == XAnimationInfoArray[keys[i]].BoneName) {
                    bone = XAnimationInfoArray[keys[i]].BoneName;
                    parent = mesh.skeleton.bones[m].parent.name;
                    break;
                }
            }
            this.hierarchy.push(this.makeBonekeys(XAnimationInfoArray[keys[i]], bone, parent));
        }
        //Xfileの仕様で、「ボーンの順番どおりにアニメーションが出てる」との保証がないため、ボーンヒエラルキーは再定義
        const keys2 = Object.keys(this.hierarchy);
        for (let i = 0; i < keys2.length; i++) {
            let parentId = -1;
            for (let k = 0; k < keys2.length; k++) {
                if (k === i) { return; }
                if (this.hierarchy[keys2[i]].parent == this.hierarchy[keys2[k]].name) {
                    parentId = k;
                    break;
                }
            }
            if (i > 0 && parentId === -1) {
                console.log('NotFoundBone!:' + this.hierarchy[keys2[i]].name + ' ,  parent =' + this.hierarchy[keys2[i]].parent);
            }
            this.hierarchy[keys2[i]].parent = parentId;
        }
    }

    //ボーンとキーフレームを再作成する
    makeBonekeys(XAnimationInfo, bone, parent) {
        const refObj = new Object();
        refObj.name = bone;
        refObj.parent = parent;
        refObj.keys = new Array();
        for(let i =0; i < XAnimationInfo.KeyFrames.length;i++){
            const keyframe = new Object();
            keyframe.time = XAnimationInfo.KeyFrames[i].time * (1.0 / this.fps);
            keyframe.matrix = XAnimationInfo.KeyFrames[i].matrix;
            // matrixを再分解。めんどくさっ
            keyframe.pos = new THREE.Vector3().setFromMatrixPosition(keyframe.matrix);
            keyframe.rot = new THREE.Quaternion().setFromRotationMatrix(keyframe.matrix);
            keyframe.scl = new THREE.Vector3().setFromMatrixScale(keyframe.matrix);
            refObj.keys.push(keyframe);
        }
        return refObj;
    }

}
