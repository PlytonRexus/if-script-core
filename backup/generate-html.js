import { Story, variableRegex } from "./parser/if-parser.js";

let target_id          = "#if_r-output-area",
    alert_area_id      = "#if_r-alerts-area",
    section_display_id = "#if_r-section-display-area",
    burger_id          = "#if_r-burger",
    stats_div_id       = "#if_r-stats-div",
    stats_div_class    = ".if_r-stats-div",
    undo_button_id	   = "#if_r-undo-button",
    reset_button_id	   = "#if_r-reset-button";

/**
 * Returns HTML formatted string of a Story instance
 *
 * @param {Story} story A Story instance
 * @returns {string} HTML formatted string
 */
function generateHTML (story) {
    const { name, sections, passages } = story;
    let wrapper = ``;
    wrapper += `<h2>${name} - New Story</h2>`;

    document.title = `${name} | IF`;

    sections.forEach(section => {
        wrapper += generateHTMLForSection(section);
    });
    return wrapper;
}

function generateSectionBySerial(serial) {
    let section = IF.story.findSection(parseInt(serial));
    return generateHTMLForSection(section);
}

function generateHTMLForSection(section) {
    let wrapper = ``;
    if (!section) {
        showAlert("Something's wrong!");
        return;
    }
    let { title, choices, text, serial } = section;

    let titleText = title;
    let titleVars = titleText.match(variableRegex);
    titleText = replaceVars(titleText, titleVars);

    let parasText = text;
    let paraVars = parasText.match(variableRegex);

    parasText = replaceVars(parasText, paraVars);

    wrapper += `<div class="if_r-section" id="section-${serial}">`;

    wrapper += `<h3 class="if_r-section-title">${titleText}</h3>`;

    wrapper += `<div class="if_r-paras">${parasText}</div>`;

    wrapper += `<ul class="if_r-section-choices-list" id="section-${serial}-choices">`;

    wrapper = loadChoices(choices, wrapper, serial);

    wrapper += `</ul>`;
    wrapper += `</div>`;

    return wrapper;
}

const loadChoices = function (choices, wrapper, serial) {
    choices.forEach((choice, i) => {
        if (isSatisfied(choice.condition)) {
            let { target, owner, mode, variables } = choice;
            let choiceVars = choice.text.match(variableRegex);
            let choiceText = choice.text;

            choiceText = replaceVars(choiceText, choiceVars);

            i += 1;

            wrapper += `<li class="if_r-section-choice-li">
<a class="if_r-section-choice" data-if_r-target="${target}" 
data-if_r-owner="${owner}" id="if_r-${serial}-choice-${i}" 
data-if_r-mode="${mode}" data-if_r-i="${i}"
data-if_r-variables="${variables.join(", ")}">${choiceText}</a>
</li>`;
        }
    });

    return wrapper;
}

const isSatisfied = function (condition) {
    if (!condition) {
        return true;
    }

    let { comparisons, glue, type } = condition;
    // let operators = ["==", ">=", "<=", ">", "<"];

    if (glue) {
        if (glue.trim() === "&") {
            comparisons.forEach(comp => {
                let truth = doesMatch(comp);

                if (!truth) {
                    return false;
                }
            });
            return true;
        }
        else if (glue.trim() === "|") {
            comparisons.forEach(comp => {
                let truth = doesMatch(comp);

                if (truth) {
                    return true;
                }
            });
            return false;
        }
    } else {
        return doesMatch(comparisons[0]);
    }
}

const doesMatch = (comp, type) => {
    let truth = false;
    if (type && type === "vs") {
        let real = IF.story.variables[comp.variable];
        let given = parseInt(comp.against) ? parseInt(comp.against) : comp.against.trim();

        // console.log("eval(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`)");

        truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`);
    } else {
        let real = IF.story.variables[comp.variable];
        let given = parseInt(comp.against) ? parseInt(comp.against) : IF.story.variables[comp.against.trim()];

        // console.log(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`);

        truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`);
    }

    return truth;
}

function replaceVars(text, vars) {
    if (vars) {
        vars.forEach(val => {
            let varName = val.replace(/\$\{/, "").replace(/\}/, "").trim();
            if (IF.story.variables[varName]) {
                text = 
                text.replace(
                    new RegExp("\\$\\{\\s*" + varName + "\\s*\\}"),
                    IF.story.variables[varName]
                );
            } else {
                text = 
                text.replace(
                    new RegExp("\\$\\{\\s*" + varName + "\\s*\\}"), 
                    ""
                );
            }
        });
    }

    return text;
}

function setupUndo() {
	setState({ lastSection: IF.state.section });
}

const recordOldValues = (vars) => {
	IF.state.oldValues = {};
	vars.forEach(variable => {
        IF.state.oldValues[variable] = IF.story.variables[variable];
    });
}

function undoVars(vars) {
	Object.keys(vars).forEach(variable => {
		IF.story.variables[variable] = vars[variable];
	});
}

function undoTurn() {
	undoVars(IF.state.oldValues);
	changeTurn(-1);
	switchSection(IF.state.lastSection.serial, true);
	document.querySelector(undo_button_id).style.display = "none";
}

function switchSection(targetSec, isUndo) {
    let sectionHTML = generateSectionBySerial(targetSec);
    loadSection(sectionHTML);

    if (!isUndo) {
    	setupUndo(); 
    	document.querySelector(undo_button_id).style.display = "block";
    }

    let section = IF.story.findSection(targetSec);
    let { timer, target } = section.settings.timer;
    if (IF.state.currentTimeout)
    clearTimeout(IF.state.currentTimeout);
    if (timer && target) {
        IF.state.currentTimeout = setTimer(timer, target);
    }

    if(!isUndo) changeTurn();

    setState({section: targetSec});

    showStats();
}

function setState(opts) {
    Object.keys(opts).forEach(opt => {
        if (opt !== "section")
        IF.state[opt] = opts[opt];
        else 
        IF.state['section'] = IF.story.findSection(opts['section']);
    });
}

function changeTurn(change) {
    setState({ turn: change ? (IF.state.turn + change) : IF.state.turn + 1 });
}

function showStats () {
    let stats = Object.keys(IF.story.variables);
    let statsHTML = `<pre> <b>Turn:</b> ${IF.state.turn}   `;

    stats.forEach(stat => {
        statsHTML += `<b>${stat}:</b> ${IF.story.variables[stat]}   `;
    });

    statsHTML += `</pre>`;

    document.querySelector(alert_area_id).innerHTML = statsHTML;
}

function loadSection(sectionHTML, serial) {
    if (!IF.story.settings.referrable) {
        replaceSection(sectionHTML, serial);
    } else {
        appendSection(sectionHTML, serial);
    }
}

function changeVariables(vars, to) {
	recordOldValues(vars);
    vars.forEach(variable => {
        IF.story.variables[variable] = parseInt(to) ?? to;
    });
}

function doActions(actions) {
    actions.forEach(act => {
        let op = act.operator.trim();
        let subject = act.subject.trim();
        let { type } = act;

        if (IF.state.oldValues[subject] !== undefined || IF.state.oldValues[subject] !== null) 
        	recordOldValues([subject]);

        if (type && type === "vs") {
            if (IF.story.variables[subject] || IF.story.variables[subject] === 0) {
                let modifier = parseInt(act.modifier) ? parseInt(act.modifier) : act.modifier.trim();
                finishAction(subject, op, modifier);
            }

        } else {
            if (IF.story.variables[subject] || IF.story.variables[subject] === 0) {
                let modifier = parseInt(act.modifier.trim()) ? parseInt(act.modifier.trim()) : IF.story.variables[act.modifier.trim()];
                finishAction(subject, op, modifier);
            }
        }
    });
}

function finishAction(subject, op, modifier) {
    if (op === "+") {
        IF.story.variables[subject] += modifier;
    } else if (op === "-") {
        IF.story.variables[subject] -= modifier;
    } else if (op === "*") {
        IF.story.variables[subject] *= modifier;
    } else if (op === "/") {
        IF.story.variables[subject] /= modifier;
    } else if (op === "=") {
        IF.story.variables[subject] = modifier;
    }
}

function setTimer (timer, target) {
    return setTimeout(() => {
        switchSection(target);
    }, timer * 1000);
}

function replaceSection(sectionHTML, serial) {
    if (serial) document.querySelector(section_display_id).innerHTML = generateSectionBySerial(serial);
    else {
        document.querySelector(section_display_id).innerHTML = sectionHTML;
    }
    setListenersOnChoices();
}

function appendSection(sectionHTML, serial) {
    if (serial) document.querySelector(section_display_id).innerHTML = generateSectionBySerial(serial);
    else {
        document.querySelector(section_display_id).innerHTML += sectionHTML;
    }
    setListenersOnChoices();
}

function showAlert(html) {
    document.querySelector(alert_area_id).innerHTML = html;
    setTimeout(() => {
        document.querySelector(alert_area_id).innerHTML = "";
    }, 3000);
}

function setListenersOnChoices () {
    document.querySelectorAll(".if_r-section-choice").forEach(choice => {
        choice.onclick = (e) => {
            e.preventDefault();
            let mode = choice.getAttribute("data-if_r-mode");
            let vars = choice.getAttribute("data-if_r-variables") ? choice.getAttribute("data-if_r-variables").split(", ") : [];
            let choiceI = choice.getAttribute("data-if_r-i");
            let actions = IF.state.section.findChoice(choiceI).actions;

            if (mode === 'input') {
                let inputValue = document.querySelector(`#if_r-choice-input-${choiceI}`).value;
                if (inputValue === "") {
                    showAlert("Empty input not allowed!");
                } else {
                    choice.onclick = "";
                    changeVariables(vars, inputValue);
                    if (actions) doActions(actions);
                    switchSection(e.target.getAttribute("data-if_r-target"));
                }
            } else {
                choice.onclick = "";
                changeVariables(vars, choice.innerHTML);
                if (actions) doActions(actions);
                switchSection(e.target.getAttribute("data-if_r-target"));
            }
        };
    });
}

function resetStory() {
	if (confirm("Restart the story? This is a beta feature.")) {
	  loadStory(IF.story);
	}
}

function generateStatsHtml() {

}

function setStats(html) {
    stats_div.innerHTML = html;
}

function showStatsDiv() {
	let stats_div = document.querySelector(stats_div_class);
	stats_div.style.display = "block";	
	stats_div.style.width = "100%";

	sidebarListeners('set');
}

function sidebarListeners(setting) {
	if (setting === 'set') {
  		document.querySelector(`${stats_div_id} .closebtn`).onclick = hideStatsDiv;
  		document.querySelector(undo_button_id).onclick = undoTurn;
  		document.querySelector(reset_button_id).onclick = resetStory;
  	} else if (setting === 'unset') {
	  	document.querySelector(`${stats_div_class} .closebtn`).onclick = "";
		document.querySelector(undo_button_id).onclick = "";
		document.querySelector(reset_button_id).onclick = "";
  	}
}

function hideStatsDiv() {
	let stats_div = document.querySelector(stats_div_class);
	stats_div.style.display = "none";
  	stats_div.style.width = "0";

  	sidebarListeners('unset');
}

const replaceHash = (str, to) => str.replace("#", to ?? "");
const replaceDot = (str, to) => str.replace(".", to ?? "");

function generateDisplay() {
    console.info("Generating dislay...");
    let $main = document.querySelector(target_id);

    $main.innerHTML = `
    <div id="${replaceHash(stats_div_id)}" class="${replaceDot(stats_div_class)}">
      <a href="javascript:void(0)" class="closebtn">&times;</a>
      <a href="#" id="${replaceHash(reset_button_id)}">Restart</a>
      <a href="#" id="${replaceHash(undo_button_id)}">Undo</a>
    </div>
    <div id="if_r-status-bar">
    <div id="${replaceHash(alert_area_id)}">
    </div>
    <div id="${replaceHash(burger_id)}">
    <a href="#" id="if_r-burger-icon">&#9776;</a>
    </div>
    </div>
    <div id="${replaceHash(section_display_id)}">
    </div>`;

    let burger = document.querySelector(burger_id);

    burger.addEventListener("click", function (e) {
        e.preventDefault();
        showStatsDiv();
    });

    console.info("Display loaded.");
}

function loadStory(story) {
    console.info("Story loading...");
    generateDisplay();

    IF.story = story;
    let { timer, target } = IF.story.settings.fullTimer;
    if (timer !== 0) setTimer(timer, target);
    setState({ section: IF.story.settings.startAt, turn: 0 });

    loadSection(null, IF.story.settings.startAt);
    showStats();
    document.querySelector(undo_button_id).style.display = "none";
    console.clear();
    console.info("Load finished. Happy playing!");
}

export { loadStory, loadSection, setState };