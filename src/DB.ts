import { Notebook, NotebookMeta } from "./notebook";
import { Deferred, Nil, util } from "./util";

const NOTEBOOKS = 'notebooks';
export namespace DB {
    let _db: IDBDatabase;
    let _notebooks: Notebook[] = [];

    export async function Init(): Promise<void> {
        let future = new Deferred();
        let request = indexedDB.open("artproc", 1);

        request.onupgradeneeded = (ev) => {
            let db = request.result;
            db.createObjectStore(NOTEBOOKS, { keyPath: "id" });
        };

        request.onsuccess = () => {
            _db = request.result;
            future.resolve();
        };

        request.onerror = (ev) => {
            future.reject(`Error creating database: ${ev}`);
        };
        await future;

        await LoadBooks();
    }

    async function LoadBooks(): Promise<void> {
        let metas = await loadHelper<NotebookMeta>(NOTEBOOKS);
        _notebooks = [];
        for (const m of metas) {
            let folder = new Notebook(m);
            _notebooks.push(folder);
        }
    }

    export async function ReloadIfChangedExternally() {
        if (!__needsUpdate) return;
        await LoadBooks();
    }

    async function loadHelper<T>(db: string): Promise<T[]> {
        let future = new Deferred<T[]>();
        let trans = _db.transaction(db, "readonly");
        let store = trans.objectStore(db);
        let request = store.getAll();
        request.onsuccess = (_) => {
            future.resolve(request.result);
        };
        request.onerror = (e) => { future.reject(`Error loading all ${db}: ${e}`) }
        return await future;
    }

    export function CreateNotebook(): Notebook {
        let now = new Date().toUTCString();
        let id = util.UUID();
        let meta: NotebookMeta = {
            id: id,
            blocks: [],
        };
        let nb = new Notebook(meta);
        _notebooks.push(nb);
        return nb;
    }

    export async function SaveNotebook(note: Notebook): Promise<void> {
        await saveHelper(NOTEBOOKS, note._meta);
    }

    async function saveHelper<T>(db: string, meta: T): Promise<void> {
        let future = new Deferred();
        let trans = _db.transaction([db], "readwrite");
        let store = trans.objectStore(db);
        let request = store.put(meta);
        request.onerror = (e) => { future.reject(`Error adding to ${db}: ${e}`); };
        request.onsuccess = () => { future.resolve(); };
        await future;
        _setDbDirty();
    }
    
    export function AllBooks(): Notebook[] { return _notebooks.filter(n => !n.isDeleted); }
    export function DeletedBooks(): Notebook[] { return _notebooks.filter(n => n.isDeleted); }

    export function GetBookById(id: string): Notebook | Nil {
        return _notebooks.find(n => n.id === id);
    }

    export async function HardDeleteBook(nb: Notebook): Promise<void> {
        await _hardDelete(NOTEBOOKS, nb.id);
        _notebooks = _notebooks.filter(n => n !== nb);
    }
    async function _hardDelete<T>(db: string, id: string): Promise<void> {
        let future = new Deferred();
        let trans = _db.transaction([db], "readwrite");
        let store = trans.objectStore(db);
        let request = store.delete(id);
        request.onerror = (e) => { future.reject(`Error deleting ${id} from ${db}: ${e}`); };
        request.onsuccess = () => { future.resolve(); };
        await future;
        _setDbDirty();
    }

}

const UPDATE_KEY = "artproc-update-key";
let __updateKey = localStorage.getItem(UPDATE_KEY);
let __needsUpdate = false;
window.addEventListener('storage', () => {
    let newKey = localStorage.getItem(UPDATE_KEY);
    if (newKey !== __updateKey) {
        __updateKey = newKey;
        __needsUpdate = true;
    }
});
function _setDbDirty() {
    __updateKey = util.UUID();
    localStorage.setItem(UPDATE_KEY, __updateKey);
}