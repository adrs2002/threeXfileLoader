
//Xfile内のフレーム構造を再現したクラス構造
export default XFrameInfo = function () {
    this.Mesh = null;
    this.Geometry = null;
    this.FrameName = "";
    this.ParentName = "";
    this.FrameStartLv = 0;
    this.FrameTransformMatrix = null;

    this.children = new Array();
    //XboneInf Array
    this.BoneInfs = new Array();
    this.VertexSetedBoneCount = new Array();    //その頂点に対し、いくつBone&Weightを割り当てたかというカウント1

    this.Materials = new Array();
}
