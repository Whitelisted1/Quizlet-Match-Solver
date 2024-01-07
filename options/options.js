async function getData(key){ return new Promise(resolve => { chrome.storage.local.get(key, function (data) { resolve(Object.values(data)[0]); }); }); }
async function storeData(key, value){ await chrome.storage.local.set({[key]: value}); }

async function getMultipleDataValues(keys){ return new Promise(resolve => { chrome.storage.local.get(keys, function (data) { resolve(data); }); }) }
async function storeMultipleDataValues(keys){ await chrome.storage.local.set(keys); }

const STRING_TYPE = 0;
const INTEGER_TYPE = 1;
const BOOL_TYPE = 2;
const ARRAY_TYPE = 3;

const settingsKeys = [
    'extensionEnabled',
    'defaultTargetTime',
    'accurateTime',
    'setCacheTime'
];

const settingsDefaultValues = [
    true,
    3000,
    false,
    600
];

const settingsKeyTypes = [
    BOOL_TYPE,
    INTEGER_TYPE,
    BOOL_TYPE,
    INTEGER_TYPE
];

async function shouldUpdate() {
    onlineVersionData = await getData("onlineVersion");
    if (onlineVersionData == undefined || (onlineVersionData.expiresAt - Date.now() < 0)) {
        console.log("Fetching remote version");
        let updateURL = "https://raw.githubusercontent.com/Whitelisted1/Quizlet-Match-Solver/main/manifest.json";
        
        res = await fetch(updateURL);
        onlineManifest = await res.json();
        onlineVersion = onlineManifest['version'];
        
        // Store in cache for a day
        storeData('onlineVersion', {'version': onlineVersion, expiresAt: Date.now() + 60 * 60 * 24 * 1000});
    } else {
        console.log("Using cache for remote version");
        onlineVersion = onlineVersionData['version'];
    }
    
    let manifestURL = chrome.runtime.getURL('manifest.json');
    
    res = await fetch(manifestURL);
    localManifest = await res.json();
    localVersion = localManifest['version'];

    if (localVersion != onlineVersion) {
        console.log("An update is available (" + localVersion + " >> " + onlineVersion + ")");

        updateElement = document.getElementById("updateText");
        updateElement.innerText = "An update is available (" + localVersion + " >> " + onlineVersion + ")";
    }
}

async function saveSettings() {
    storedSettingsValues = { };

    for (var i = 0; i < settingsKeys.length; i++) {
        thisKey = settingsKeys[i];
        thisType = settingsKeyTypes[i];

        element = document.getElementById(thisKey);

        if (thisType == STRING_TYPE || thisType == INTEGER_TYPE) {
            storedSettingsValues[thisKey] = element.value;
        }
        else if (thisType == BOOL_TYPE) {
            storedSettingsValues[thisKey] = element.checked;
        }
    }


    await storeMultipleDataValues(storedSettingsValues);
}

async function fetchAndDisplaySettings() {
    const settingsValues = await getMultipleDataValues(settingsKeys);

    for (var i = 0; i < settingsKeys.length; i++) {
        thisKey = settingsKeys[i];
        thisType = settingsKeyTypes[i];
        keyValue = settingsValues[thisKey];

        if (keyValue == undefined) {
            thisKeyDefaultValue = settingsDefaultValues[i];
            await storeData(thisKey, thisKeyDefaultValue);
            settingsValues[thisKey] = thisKeyDefaultValue;
            i--;
            continue;
        }

        element = document.getElementById(thisKey);

        element.addEventListener("change", async (e) => {
            thisType = settingsKeyTypes[ settingsKeys.indexOf(e.srcElement.id) ];
            
            if (thisType == STRING_TYPE || thisType == INTEGER_TYPE) {
                await storeData(e.srcElement.id, e.srcElement.value);
            }
            else if (thisType == BOOL_TYPE) {
                await storeData(e.srcElement.id, e.srcElement.checked);
            }
        });

        if (thisType == STRING_TYPE || thisType == INTEGER_TYPE) {
            element.value = keyValue;
        }
        else if (thisType == BOOL_TYPE) {
            element.checked = keyValue;
        }

    }
}

window.addEventListener("load", async () => {
    document.getElementById("resetSettings").addEventListener("click", () => {
        chrome.storage.local.clear();
        fetchAndDisplaySettings();
    });

    document.getElementById("resetCardCache").addEventListener("click", () => {
        storeData("cardsCache", {});
    });

    // document.getElementById("applySettings").addEventListener("click", () => {
    //     saveSettings();
    // });

    await fetchAndDisplaySettings();
    shouldUpdate();
});