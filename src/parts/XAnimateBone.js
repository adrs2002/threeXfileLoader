

export default class XAnimateBone {

    constructor() {

        this.targetBone = null;
        
        this.keyFrames = {};
        
        this.nowFrameValue = {};

    }

    setBoneMatrixFromKeyFrame(_animeSetName, _keyFrameNum, _animeName) {

        const boneMxValue = new THREE.Matrix4();
        if (this.keyFrames[_animeSetName] == null) { return; }

        for (let m = 0; m < this.keyFrames[_animeSetName].length; m++) {

            if (this.keyFrames[_animeSetName][m].Frame >= _keyFrameNum) {

                if (this.keyFrames[_animeSetName][m].Frame == _keyFrameNum) {

                    boneMxValue.copy(this.keyFrames[_animeSetName][m].Matrix);
                }

                else {
                    
                    if (this.keyFrames[_animeSetName].length > 0) {

                        boneMxValue.copy(LerpKeyFrame(_keyFrameNum,
                            this.keyFrames[_animeSetName][m - 1].Frame,
                            this.keyFrames[_animeSetName][m - 1].Matrix,
                            this.keyFrames[_animeSetName][m].Frame,
                            this.keyFrames[_animeSetName][m].Matrix));

                    } else {

                        boneMxValue.copy(this.keyFrames[_animeSetName][m].Matrix);

                    }
                }

                break;

            }

        }

        this.nowFrameValue[_animeName] = boneMxValue;

    }

}
