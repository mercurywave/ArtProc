import { Flow } from "./flow";


const SETTING_PATH = 'artproc-settings';

interface ISettings {
    v: number;
}

let _config: ISettings;

export namespace Config {

    export async function LoadSettings(): Promise<void> {
        let str = window.localStorage.getItem(SETTING_PATH);
        if (str) try {
            _config = JSON.parse(str);
            CleanSettings();
        } catch { ResetSettings(); }
        else ResetSettings();
    }
    export function Save() {
        window.localStorage.setItem(SETTING_PATH, JSON.stringify(_config));
        Flow.Dirty();
    }
}

function CleanSettings() {
}

function ResetSettings() {
    _config = {
        v: 1,
    };
}