
//ボーンとそれに紐付けられたキーフレーム。
//ボーン1種類毎に１つ用意される。
export default class XAnimateBone {
    constructor() {
        this.TargetBone = null;
        //複数のAninmationSetが来ることを想定。ここの配列は、AnimationSetで検索されるDictionary型
        this.KeyFrames = {};
        //「現在表示対象」となるアニメーション名とボーンMxの組み合わせ。
        this.nowFrameValue = {};
        this.LastKeyFrameValue = new THREE.Matrix4();
    }

    setBoneMatrixFromKeyFrame(_animeSetName, _keyFrameNum, _animeName) {

        const boneMxValue = new THREE.Matrix4();
        if (this.KeyFrames[_animeSetName] == null) { return; }

        for (let m = 0; m < this.KeyFrames[_animeSetName].length; m++) {
            if (this.KeyFrames[_animeSetName][m].Frame >= _keyFrameNum) {
                if (this.KeyFrames[_animeSetName][m].Frame == _keyFrameNum) {
                    boneMxValue.copy(this.KeyFrames[_animeSetName][m].Matrix);
                }
                else {
                    //終了キーとの中間キーをセットする
                    if (this.KeyFrames[_animeSetName].length > 0) {

                        boneMxValue.copy(LerpKeyFrame(_keyFrameNum,
                            this.KeyFrames[_animeSetName][m - 1].Frame,
                            this.KeyFrames[_animeSetName][m - 1].Matrix,
                            this.KeyFrames[_animeSetName][m].Frame,
                            this.KeyFrames[_animeSetName][m].Matrix));
                    } else {
                        boneMxValue.copy(this.KeyFrames[_animeSetName][m].Matrix);
                    }
                }
                break;
            }
        }

        //↓これらは「一時的」なMatrixにセットすべきもの。最終合成は別の箇所で行うべき
        //this.nowFrameValue = boneMxValue;   
        this.nowFrameValue[_animeName] = boneMxValue;
    }
}
