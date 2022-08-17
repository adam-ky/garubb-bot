const fs = require('fs')
const storage = require("node-persist");
const {Person, Model} = require("./model");
const ObjectsToCsv = require('objects-to-csv')

InputHandler = (model) => async (input) => {
    const tokens = input.trim().split(" ")
    if (tokens.length === 0)
        return;
    const command = tokens[0].toLowerCase()
    const args = tokens.slice(1)
    switch (command) {
        // TODO: add command to save ID pairings to file

        // case "load":
        //    TODO: fix load circular

        //     model.copyPeopleFrom(await LoadCommand(args[0], false, model));
        //     console.log(model.dumpUuids())
        //     model.saveToStorage()
        //     breduak;
        case "loadpaired":
            await LoadCommand(args[0], true, model);
            // console.log(model.dumpUuids())
            model.saveToStorage()
            break;
        case "list":
        case "ls":
        case "show":
            //TODO: show telegram ID
            ListAll(model, ...args)
            break
        case 'dump':
            Dump(model)
            break
        case "announce":
            Announce(model)
            break
        case "d":
        case "rm":
        case "delete":
        case "deregister":
            Deregister(model, args[0])
            break
        //TODO: add save to storage
        //TODO: add command to print registered participants and their ID
        case "nuke":
            // TODO: check for confirmation
            // delete all node persist data
            await storage.defaultInstance.clear();
            console.log("All data deleted. Restart the app to take effect.");
            break
        case "save":
            model.saveToStorage()
            break;
        default:
            console.log("Unknown command", command)
    }
}

async function Deregister(model, uuid) {
    const person = model.getPersonByUuid(uuid)
    if (person) { //ID exists
        //TODO: differentiate message based on whether person had registered
        console.log("Deregistered", person.name, uuid, person.telegramId)
        person.deregister()
        model.saveToStorage()
    } else {
        console.log("No one with that code found")
    }
}

async function Announce(model) {
    console.log('wip command')
}

// loadpaired data.txt
function loadPaired(content, model) {

    //TODO: print new uuids
    content.split("\n").forEach(line => {
        if (line.trim() === "") {
            return;
        }
        
        const angelName = line.split(",")[0].trim()
        const mortalName = line.split(",")[1].trim()
        
        if (model.getPersonByName(angelName) || model.getPersonByName(mortalName)) {
            const player = model.getPersonByName(angelName) ? angelName : mortalName
            console.error("Error: name " + player + " is already used!");
            return;
        }
        
        if (angelName === "" || mortalName === "") {
            console.error("Invalid line: " + line)
        } else {
            const newAngel = new Person().withName(angelName)
            const newMortal = new Person().withName(mortalName)
            model.addPerson(newAngel)
            model.addPerson(newMortal)
            console.log(newAngel.name + " - " + newAngel.uuid +"\n"
                        + newMortal.name + " - " + newMortal.uuid);
            // console.log(a, m)
            newAngel.angel = newMortal.uuid
            newMortal.angel = newAngel.uuid
            console.log(`${angelName}-${mortalName}\n`)
        }
    })
}

function loadCircular(content) {
    const model = new Model();
    content.split("\n").forEach(line => {
        const name = line.trim()
        if (name !== "") {
            const person = new Person().withName(name)
            model.addPerson(person)
        }
    })
    // model.generateUuids()
    model.setupAMRefs()
    return model
}

async function LoadCommand(path, paired = false, model) {
    console.log(`Loading data from ${path}`)
    const content = fs.readFileSync(path, {encoding: "utf8"});

    paired ? loadPaired(content, model) : loadCircular(content)
}

async function ListAll(model, ...args) {
    let out = ""
    out += 'userid | name | GaruBB\'s name | registered?\n'
    out += (model.getPeople().map(person => {
        const angel = model.getPersonByUuid(person.angel)
        const angelName = angel === null ? "--" : angel.name;
        return `${person.uuid} | ${person.name} | ${angelName} | ${person.isRegistered()}`
    }).join("\n"))
    if (args[0]) {
        fs.writeFileSync(args[0], out)
    } else {
        console.log(out)
    }
}

async function Dump(model) {
    const data = await storage.defaultInstance.get('data')
    const csv = new ObjectsToCsv(data)

    csv.toDisk('./players_uuid.csv')
        .then(() => 'Data dumped.')
        .catch(() => "Couldn't load data from storage. No data to dump.failed promise.")
}

module.exports = {InputHandler, LoadCommand}

