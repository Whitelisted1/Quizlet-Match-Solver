function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Loading Quizlet match solver ...');

path = window.location.pathname;

if (!path.endsWith('/match')) {
    throw new Error();
}

definitions = [
    ["Word", "Definition"]
];

var remainingTiles = [];
for (var i=0; i < definitions.length; i++) {
    remainingTiles.push(definitions[i][0]);
}


running = true;
console.log(path);
window.addEventListener('load', async() => {

    console.log("Window loaded");
    
    startButton = document.getElementsByClassName('MatchModeInstructionsModal MatchModeInstructionsModal--normal');
    gameStarted = startButton.length == 0;
    if(!gameStarted){
        console.log("Starting game ...");
        document.querySelector('button[aria-label="Start game"]').click();
    }

    while (running) {
        console.log('updating ...');

        // console.log(remainingTiles);
        if (remainingTiles.length == 0) {
            console.log("No more remaining tiles");
            running = false;
            // continue;
        }
        
        gameboard = [];
        gameboardTilesList = [];

        gameboardTiles = document.getElementsByClassName('MatchModeQuestionGridBoard-tiles')[0].childNodes;
        if (gameboardTiles == undefined) {
            console.log("No child nodes ... ");
            return;
        }

        for (var y = 0; y < gameboardTiles.length; y++) {
            if (gameboardTiles[y].innerHTML == "") {
                console.log(gameboardTiles[y] + " tile is empty");
                continue; // If the element is empty (it already clicked this element), then skip it
            }
            
            gameboardTilesList.push(gameboardTiles[y]);
            // console.log(1, gameboardTiles[y].firstElementChild.innerText);
            gameboard.push(gameboardTiles[y].firstElementChild.innerText);
        }

        if (gameboard.length === 0) {
            console.log("Gameboard is empty ...");
            running = false;
            continue;
        }
        
        // console.log(gameboard);
        // console.log(3, remainingTiles);
        while (!gameboard.includes(remainingTiles[0]) && remainingTiles.length != 0) {
            console.log(remainingTiles[0] + " is not on the board");
            remainingTiles.splice(0, 1);
        }
        // console.log(4, remainingTiles);

        console.log("Working Tile: ", gameboard[0])
        workingTile = document.querySelector("div[aria-label='" + gameboard[0] + "']");
        workingTile.parentElement.parentElement.dispatchEvent(new PointerEvent('pointerdown'));
        
        // await delay(1);
        
        matchingCardText = findMatchingCard(gameboard[0])
        matchingTile = document.querySelector("div[aria-label='" + matchingCardText + "']");

        matchingTile.parentElement.parentElement.dispatchEvent(new PointerEvent('pointerdown'));
        
        // remainingTiles.splice(0, 1);
        
        
        await waitUntilNoHTML(gameboardTilesList[0]);
    }

    console.log("No longer running loop");
    
});


function matchGame(){
    
}

async function waitUntilNoHTML(element) {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver((mutationsList) => {
            const hasInnerHTMLChanged = mutationsList.some(
                (mutation) => mutation.type === 'childList' && mutation.target === element
            );

            if (hasInnerHTMLChanged) {
                if (element.innerHTML == "") {
                    console.log("innerHTML is now blank");
                    observer.disconnect();
                    resolve();
                }
            }
        });

        // Configure and start observing the target element
        observer.observe(element, { childList: true, subtree: true });

        // Check initial state
        if (element.innerHTML === "") {
            observer.disconnect();
            resolve();
        }
    });
}

function findMatchingCard(text){
    for (var i=0; i < definitions.length; i++){
        def = definitions[i]

        if (def.includes(text)) {
            for (var t=0; t < def.length; t++){
                if(def[t] != text) {
                    targetText = def[t];
                    i = definitions.length;
                    break;
                }
            }
        }

    }

    return targetText;
}