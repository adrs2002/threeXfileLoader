// import * as XAnimationInfo from 'XAnimationInfo.js'
// import * as _xdata from 'rawXdata.js'

export default class XAnimationObj {
    constructor() {
        this.fps = 60;
        this.name = 'xanimation';
        this.length = 0;
        this.hierarchy = new Array();
    }

    make(XAnimationInfoArray){
        const keys = Object.keys(XAnimationInfoArray);
        for(let i=0;i <keys.length;i++){
            this.hierarchy[keys[i]] = this.makeBonekeys(XAnimationInfoArray[keys[i]]);          
        }
    }

    makeBonekeys(XAnimationInfo)
    {
        const refObj = new Object();
        refObj.name = XAnimationInfo.BoneName;
        refObj.parent = XAnimationInfo.parentBoneName;
        return refObj;
    }
    
    makeKeys()
    {

    }

    getParentName()
    {
        _FrameInfo_Raw
    }

    getParentBoneIndex()
    {

    }
}
