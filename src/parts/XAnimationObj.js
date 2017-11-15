// import * as XAnimationInfo from 'XAnimationInfo.js'
// import * as _xdata from 'rawXdata.js'

export default class XAnimationObj {

    constructor(_flags) {

        this.fps = 30;
        this.name = 'xanimation';
        this.length = 0;
        this.hierarchy = [];

        this.putFlags = _flags;
        if (this.putFlags.putPos === undefined) {
            this.putFlags.putPos = true;
        }
        if (this.putFlags.putRot === undefined) {
            this.putFlags.putRot = true;
        }
        if (this.putFlags.putScl === undefined) {
            this.putFlags.putScl = true;
        }
    }

    make(XAnimationInfoArray) {
        for (let i = 0; i < XAnimationInfoArray.length; i++) {
            this.hierarchy.push(this.makeBonekeys(XAnimationInfoArray[i]));
        }
        this.length = this.hierarchy[0].keys[this.hierarchy[0].keys.length - 1].time;
    }

    clone() {
        return Object.assign({}, this);
    }

    makeBonekeys(XAnimationInfo) {

        const refObj = {};
        refObj.name = XAnimationInfo.boneName;
        refObj.parent = "";
        refObj.keys = this.keyFrameRefactor(XAnimationInfo);
        refObj.copy = function () {
            return Object.assign({}, this);
        };
        return refObj;

    }

    keyFrameRefactor(XAnimationInfo) {
        const keys = [];
        for (let i = 0; i < XAnimationInfo.keyFrames.length; i++) {

            const keyframe = {};
            keyframe.time = XAnimationInfo.keyFrames[i].time * this.fps;

            if (XAnimationInfo.keyFrames[i].pos && this.putFlags.putPos) {
                keyframe.pos = XAnimationInfo.keyFrames[i].pos;
            }

            if (XAnimationInfo.keyFrames[i].rot && this.putFlags.putRot) {
                keyframe.rot = XAnimationInfo.keyFrames[i].rot;
            }

            if (XAnimationInfo.keyFrames[i].scl && this.putFlags.putScl) {
                keyframe.scl = XAnimationInfo.keyFrames[i].scl;
            }

            if (XAnimationInfo.keyFrames[i].matrix) {
                keyframe.matrix = XAnimationInfo.keyFrames[i].matrix;
                if (this.putFlags.putPos) {
                    keyframe.pos = new THREE.Vector3().setFromMatrixPosition(keyframe.matrix);
                }
                if (this.putFlags.putRot) {
                    keyframe.rot = new THREE.Quaternion().setFromRotationMatrix(keyframe.matrix);
                }
                if (this.putFlags.putScl) {
                    keyframe.scl = new THREE.Vector3().setFromMatrixScale(keyframe.matrix);
                }
            }

            keys.push(keyframe);

        }
        return keys;
    }


}