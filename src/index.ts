import { Config } from "./config";
import { DB } from "./DB";
import { Flow, Route } from "./flow";
import { Notebook } from "./notebook";


document.addEventListener("DOMContentLoaded", () => {
    setup().then(initUi);
});

async function setup(): Promise<void> {
    await Config.LoadSettings();
    await DB.Init();
    await Route.Init();
}
window.addEventListener('popstate', () => Route.OnNavigate());

function initUi() {
    let main = document.querySelector("body") as HTMLElement;
    Flow.Init(main, mkRoot);
}

Route.RegisterDefault("menu", (flow) => {
    mkMainMenu(flow);
});

Route.Register("book", (flow, path) => {
    bldNotebook(flow, path['id'] ?? "");
}, (path) => {
    if (!path['id'] || !DB.GetBookById(path['id']))
        Route.ErrorFallback();
});

// Route.Register("settings", (flow, pars) => {
//     mkSettings(flow);
// });

function mkRoot(flow: Flow) {
    let main = flow.child("div", { id: "main" });

    let outer = flow.elem(main, "div", { id: "mainOuter" });
    let bind = flow.bindObject(() => 'k' + Route.GetUniqPage(), mkMain, outer);
    //bind.setAnimRemoval(150, "fade-out-view");
    flow.bindAsMainRouteScroll(outer);
}

function mkMain(flow: Flow) {
    let viewContainer = flow.root("div", { className: "viewContainer" });
    flow.routePage(viewContainer, Route.GetUniqPage());
}

function mkMainMenu(flow: Flow) {
    let container = flow.child("div", { className: "menu-main" });
    for (const saved of DB.AllBooks()) {
        let btOpenNotebook = flow.elem<HTMLAnchorElement>(container, "a", {
            innerText: saved.name ?? "[Temporary Notebook]",
            title: saved.id,
        });
        btOpenNotebook.addEventListener("click", () => Route.Launch("book", { id: saved.id }));
    }
    let btNewNotebook = flow.elem<HTMLButtonElement>(container, "button", {
        type: "button",
        innerText: "+New Notebook",
        className: "btMenu",
    });
    btNewNotebook.addEventListener("click", () => {
        let book = DB.CreateNotebook();
        Route.Launch("book", { id: book.id });
    });

    let btGear = flow.child<HTMLButtonElement>("button", {
        type: "button",
        innerText: "⚙️",
        className: "btIcon",
    });
    btGear.addEventListener("click", () => Route.Launch("settings"));
}

function bldNotebook(flow: Flow, id: string) {
    let notebook = DB.GetBookById(id);
    if(!notebook) throw 'could not find notebook';

    let input = flow.child<HTMLInputElement>("input", {
        className: "edFolder",
        type: "text",
        placeholder: "Unnamed Folder",
        autocomplete: "off",
    });
    flow.bind(() => {
        input.value = notebook.name;
    });
    input.addEventListener("change", () => {
        notebook.name = input.value;
    });
    
    let blockList = flow.child("div", { className: "block-list" });
    // let bind = flow.bindArray(() => notebook.blocks, mkBlock, blockList);
    // bind.setAnimRemoval(200, "fade-out");

    bldNewBlock(flow, notebook);
}

function bldNewBlock(flow: Flow, notebook: Notebook){
    let container = flow.child("div", { className: "notebook-footer" });
    let btAddBlock = flow.elem<HTMLButtonElement>(container, "button", {
        type: "button",
        innerText: "+Block",
        className: "btNotebookFooter",
    });
    btAddBlock.addEventListener("click", () => {
        notebook.createBlock();
    });
}