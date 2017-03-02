import * as XAnimationInfo from './XAnimationInfo'
import * as _xdata from './rawXdata'

class XAnimationObj {
    constructor() {
        this.fps = 60;
        this.name = 'xanimation';
        this.length = 0;
        this.hierarchy = new Array();
    }

    make(XAnimationInfoArray, _xdata){
        for(let i=0;i <XAnimationInfoArray.length;i++){
            this.hierarchy[i] = makeBonekeys(XAnimationInfoArray[i], _xdata);          
        }
    }

    makeBonekeys(XAnimationInfo, _xdata)
    {
        const refObj = new object();
        refObj.name = XAnimationInfo.BoneName;
        refObj.parent = this.getParentBoneIndex(refObj.name, _xdata);
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

export default XAnimationObj;