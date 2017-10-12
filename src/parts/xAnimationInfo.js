export default class XAnimationInfo {
    constructor() {
        this.animeName = "";
        this.boneName = "";
        this.targetBone = null;

        this.frameStartLv = 0;
        this.keyFrames = [];
        this.InverseMx = null;
    }
}