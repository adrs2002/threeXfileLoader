
import * as XAnimationObj from './XAnimationObj'

export default class Xdata {
    constructor() {
        //XFrameInfo Array(final output)
        this.FrameInfo = new Array();

        //XFrameInfo Array
        this.FrameInfo_Raw = new Array();

        this.AnimationSetInfo = new Array();

        this.AnimTicksPerSecond = 60;
        
        this.XAnimationObj = null;
    }
};
