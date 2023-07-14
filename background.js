function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Loading Quizlet match solver ...');

const path = window.location.pathname;
console.log(path);

// Only continue if the website ends with /match.
// Wraps the rest of the script as actually ending execution of a javascript file involves raising an error
if (path.endsWith('/match')) {

thisID = path.split("/")[1];

// https://www.thiscodeworks.com/get-quizlet-flashcards-via-api/61bbc4382e046e00150bd05b
async function getQuizletCards(id){
    let res = await fetch(`https://quizlet.com/webapi/3.4/studiable-item-documents?filters%5BstudiableContainerId%5D=${id}&filters%5BstudiableContainerType%5D=1&perPage=5&page=1`).then(res => res.json())

    let currentLength = 5;
    let token = res.responses[0].paging.token
    let terms = res.responses[0].models.studiableItem;
    let page = 2;

    while (currentLength >= 5){
        let res = await fetch(`https://quizlet.com/webapi/3.4/studiable-item-documents?filters%5BstudiableContainerId%5D=${id}&filters%5BstudiableContainerType%5D=1&perPage=5&page=${page++}&pagingToken=${token}`).then(res => res.json());
        terms.push(...res.responses[0].models.studiableItem);
        currentLength = res.responses[0].models.studiableItem.length;
        token = res.responses[0].paging.token;
    }

    return terms;
}

let running = true;
console.log(path);
window.addEventListener('load', async() => {
    console.log("Window loaded");

    // Grab the Quizlet cards and add them to the definitions list. This makes it so the user doesn't have to do this manually
    quizletMatchInfo = await getQuizletCards(thisID);
    definitions = [];

    for (var i = 0; i < quizletMatchInfo.length; i++) {
        thisItem = quizletMatchInfo[i];

        if (thisItem.isDeleted) continue;
        
        definitions.push([ thisItem.cardSides[0].media[0].plainText, thisItem.cardSides[1].media[0].plainText ])
    }

    console.log(definitions);

    let remainingTiles = [];
    for (var i=0; i < definitions.length; i++) {
        remainingTiles.push(definitions[i][0]);
    }
    
    startButton = document.getElementsByClassName('MatchModeInstructionsModal MatchModeInstructionsModal--normal');
    gameStarted = startButton.length == 0;
    if(!gameStarted){
        console.log("Starting game ...");
        document.querySelector('button[aria-label="Start game"]').click();
    }

    while (running) {
        console.log('updating ...');

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
            gameboard.push(gameboardTiles[y].firstElementChild.innerText);
        }

        if (gameboard.length === 0) {
            console.log("Gameboard is empty ...");
            running = false;
            continue;
        }
        
        while (!gameboard.includes(remainingTiles[0]) && remainingTiles.length != 0) {
            console.log(remainingTiles[0] + " is not on the board");
            remainingTiles.splice(0, 1);
        }

        console.log("Working Tile: ", gameboard[0])
        workingTile = document.querySelector("div[aria-label='" + gameboard[0] + "']");
        workingTile.parentElement.parentElement.dispatchEvent(new PointerEvent('pointerdown'));
        
        // await delay(1);
        
        matchingCardText = findMatchingCard(gameboard[0])
        matchingTile = document.querySelector("div[aria-label='" + matchingCardText + "']");

        matchingTile.parentElement.parentElement.dispatchEvent(new PointerEvent('pointerdown'));
        
        // remainingTiles.splice(0, 1);
        
        
        await waitUntilNoHTML(gameboardTilesList[0]);
        // await delay(5);
    }

    console.log("No longer running loop");
    
});


function matchGame(){
    
}

// watch an element until it is blank. Used for waiting for cards to disappear.
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

// Given a text input, find the text of the matching word/definition
function findMatchingCard(text){
    for (var i=0; i < definitions.length; i++){
        var thisDefinition = definitions[i];

        indexOfWord = thisDefinition.indexOf(text);

        if (indexOfWord != -1) {
            indexOfTargetWord = ((indexOfWord+1) % 2);
            console.log(indexOfWord, indexOfTargetWord, thisDefinition[indexOfTargetWord]);
            return thisDefinition[indexOfTargetWord];
        }
    }
}

}   