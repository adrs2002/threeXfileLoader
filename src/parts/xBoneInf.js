
//ボーン（ウェイト）情報格納クラス構造
export default class XboneInf {
    constructor() {
        this.BoneName = "";
        //重要：ボーンを1次元配列化したときの配列内index。skinindexに対応する
        this.BoneIndex = 0;
        //このIndecesは頂点Indexということ
        this.Indeces = new Array();
        this.Weights = new Array();
        this.initMatrix = null;
        this.OffsetMatrix = null;
    }
};