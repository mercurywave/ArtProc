import { Config } from "./config";
import { DB } from "./DB";
import { Flow } from "./flow";
import { util } from "./util";

export class Notebook {
    public blocks: Block[] = []; // Don't modify directly - this needs to sync with meta
    public _meta: NotebookMeta;
    private _permanent: boolean = false;
    public constructor(meta: NotebookMeta) {
        this._meta = meta;
        this.blocks = meta.blocks.map(obj => new Block(this, obj));
        this._permanent = !!this._meta.name;
    }

    public FlagDirty(): void {
        Flow.Dirty();
        if (!this._permanent) return;
        DB.SaveNotebook(this);
    }

    public get id(): string { return this._meta.id; }
    public get isDeleted(): boolean { return this._meta.isDeleted ?? false; }
    public get name(): string { return this._meta.name ?? ""; }
    public set name(val: string) {
        if (val != "") this._meta.name = val;
        else delete this._meta.name;
        this._permanent = !!this._meta.name;
        this.FlagDirty();
    }

    public createBlock(idx?: number): Block {
        let meta = { type: eBlock.Unknown, id: util.UUID() };
        let block = new Block(this, meta);
        this.insertBlock(block, idx);
        return block;
    }

    public insertBlock(block: Block, idx?: number): Block {
        if (idx !== undefined && idx >= 0 && idx < this.blocks.length) {
            this.blocks.splice(idx, 0, block);
            this._meta.blocks.splice(idx, 0, block._meta);
        } else {
            this.blocks.push(block);
            this._meta.blocks.push(block._meta);
        }
        this.FlagDirty();
        return block;
    }

    public deleteBlock(block: Block) {
        let idx = this.blocks.indexOf(block);
        this.blocks.splice(idx, 1);
        this._meta.blocks.splice(idx, 1);
        this.FlagDirty();
    }

    public getInputStreamAt(block: Block): ImageBitmap {
        let idx = this.blocks.indexOf(block) - 1;
        for (; idx >= 0; idx--) {
            let bk = this.blocks[idx]!;
            let out = bk.output;
            if (out != null) return out;
        }
        return new ImageBitmap();
    }
}

export class Block {
    public notebook: Notebook;
    public _meta: BlockMeta;
    public _output: ImageBitmap | null = null;
    public constructor(nb: Notebook, meta: BlockMeta) {
        this.notebook = nb;
        this._meta = meta;
    }
    public FlagDirty(): void {
        this.notebook.FlagDirty();
    }
    public get type(): eBlock { return this._meta.type; }
    public set type(val: eBlock) {
        if (this.type == val) return;
        this._meta.type = val;
        // Should I clear data?
        this.FlagDirty();
    }
    public get id(): string { return this._meta.id; }
    public get expandSettings(): boolean { return this._meta.expandSettings ?? false; }
    public set expandSettings(val: boolean) {
        if ((this.expandSettings ?? false) == val) return;
        if (val) this._meta.expandSettings = val;
        else delete this._meta.expandSettings;
        this.FlagDirty();
    }
    public get expandOutput(): boolean { return this._meta.expandOutput ?? false; }
    public set expandOutput(val: boolean) {
        if ((this.expandOutput ?? false) == val) return;
        if (val) this._meta.expandOutput = val;
        else delete this._meta.expandOutput;
        this.FlagDirty();
    }

    public get output(): ImageBitmap | null {
        return this._output;
    }
    public async run() {
        let stream = this.notebook.getInputStreamAt(this);
        let output = await this.runSingleCode(stream);
        this._output = output;
        Flow.Dirty();
    }

    public async runSingleCode(stream: ImageBitmap): Promise<ImageBitmap> {
        if (this.type == eBlock.Function) {
            let func = __functions.find((f) => f.key == this._meta.functionKey);
            if (!func) throw new Error(`Function not found: ${this._meta.functionKey}`);
            let result = func.code(stream, {});
            return result;
        }
        throw 'run path not implemented';
    }

    public static allTypes(): eBlock[] {
        return [
            eBlock.Unknown, eBlock.Function,
        ];
    }

    public static getTypeName(type: eBlock): string {
        switch (type) {
            case eBlock.Function: return "Function";
            default: return "Unknown";
        }
    }
}

function jsEval(code: string, stream: string): string {
    try {
        console.log(code);
        eval(code);
        console.log(stream);
    } catch (err) { return `ERROR: ${err}`; }
    return stream;
}


// data interface stored in indexdb
export interface NotebookMeta {
    id: string;
    name?: string;
    blocks: BlockMeta[];
    isDeleted?: boolean;
}

export interface BlockMeta {
    id: string;
    type: eBlock;
    functionKey?: string;
    autoExec?: boolean;
    expandSettings?: boolean;
    expandOutput?: boolean;
}

export enum eBlock {
    Unknown = 0, Function = 1,
}

export interface IFunction {
    inputs: { [key: string]: string };
    key: string;
    code: (src:ImageBitmap, inputs: { [key: string]: string }) => ImageBitmap;
}

let __functions: IFunction[] = [];
export function RegisterFunction(key: string, inputs: { [key: string]: string }, code: (src:ImageBitmap, inputs: { [key: string]: string }) => ImageBitmap): void {
    __functions.push({ key, inputs, code });
}