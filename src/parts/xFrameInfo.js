export default class XFrameInfo {
    constructor() {
        this.Mesh = null;
        this.Geometry = null;
        this.FrameName = "";
        this.ParentName = "";
        this.frameStartLv = 0;
        this.FrameTransformMatrix = null;

        this.children = [];

        this.BoneInfs = [];
        this.VertexSetedBoneCount = [];

        this.Materials = [];

    }
}