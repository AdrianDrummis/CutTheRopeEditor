class CloneIDs {
    constructor() {
        this.nextId = 1;
        this.freeIds = [];
        this.clones = {};      // id -> clone target
        this.cloneData = {};   // id -> custom data
        this.allIdsList = [];
        this.frameCounter = 0;

        // Reset on project stop
        Scratch.vm.runtime.on('PROJECT_STOP_ALL', () => this.reset());
        Scratch.vm.runtime.on('PROJECT_STOP_OTHER', () => this.reset());

        // Automatic cleanup every 5 frames
        Scratch.vm.runtime.on('PROJECT_UPDATE', () => {
            this.frameCounter++;
            if (this.frameCounter % 5 === 0) this.cleanupClones();
        });
    }

    getInfo() {
        return {
            id: 'cloneids',
            name: 'Clone IDs',
            color1: '#dbd21a',
            color2: '#cfc514',
            color3: '#b8b110',
            blocks: [
                { opcode: 'assignCloneID', blockType: Scratch.BlockType.COMMAND, text: 'assign ID to this clone' },
                { opcode: 'setData', blockType: Scratch.BlockType.COMMAND, text: 'set data [KEY] to [VAL]', arguments: { KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'health' }, VAL: { type: Scratch.ArgumentType.STRING, defaultValue: '100' } } },
                { opcode: 'deleteCloneByID', blockType: Scratch.BlockType.COMMAND, text: 'delete clone with ID [ID]', arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },

                { opcode: 'getMyID', blockType: Scratch.BlockType.REPORTER, text: 'ID of myself' },
                { opcode: 'getPropertyOfID', blockType: Scratch.BlockType.REPORTER, text: '[PROPERTY] of ID [ID]', arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }, PROPERTY: { type: Scratch.ArgumentType.STRING, menu: 'properties', defaultValue: 'x' } } },
                { opcode: 'idExists', blockType: Scratch.BlockType.BOOLEAN, text: 'does ID [ID] exist?', arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                { opcode: 'getData', blockType: Scratch.BlockType.REPORTER, text: 'data [KEY] of ID [ID]', arguments: { KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'health' }, ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                { opcode: 'getAllIDs', blockType: Scratch.BlockType.REPORTER, text: 'all clone IDs' }
            ],
            menus: {
                properties: ['x', 'y', 'direction', 'costume number', 'size']
            }
        };
    }

    // ===== COMMANDS =====
    assignCloneID(args, util) {
        if (!util.target.isOriginal && !util.target.myCloneID) {
            const id = this.freeIds.length > 0 ? this.freeIds.shift() : this.nextId++;
            util.target.myCloneID = id;

            this.cloneData[id] = {}; // no original sprite stored now
            this.clones[id] = util.target;
            this.updateAllIdsList();

            // Patch dispose to handle deletions
            const originalDispose = util.target.dispose?.bind(util.target) || (() => {});
            util.target.dispose = () => {
                delete this.clones[id];
                delete this.cloneData[id];
                const index = this.allIdsList.indexOf(id);
                if (index >= 0) this.allIdsList.splice(index, 1);
                this.freeIds.push(id);
                originalDispose();
            };
        }
    }

    setData({ KEY, VAL }, util) {
        const id = util.target.myCloneID;
        if (id && this.cloneData[id]) this.cloneData[id][KEY] = VAL;
    }

    deleteCloneByID({ ID }) {
        const clone = this.clones[ID];
        if (clone && clone.isOriginal === false) {
            Scratch.vm.runtime.disposeTarget(clone);
            delete this.clones[ID];
            delete this.cloneData[ID];
            this.freeIds.push(ID);
            this.updateAllIdsList();
        }
    }

    cleanupClones() {
        for (const id in this.clones) {
            const clone = this.clones[id];
            if (!clone || !clone.stage) {
                delete this.clones[id];
                delete this.cloneData[id];
                this.freeIds.push(Number(id));
            }
        }
        this.updateAllIdsList();
    }

    // ===== REPORTERS =====
    getMyID(args, util) { return util.target.myCloneID || 0; }

    getPropertyOfID({ ID, PROPERTY }) {
        const clone = this.clones[ID];
        if (!clone) return 0;
        switch (PROPERTY) {
            case 'x': return clone.x;
            case 'y': return clone.y;
            case 'direction': return clone.direction;
            case 'costume number': return clone.currentCostume + 1;
            case 'size': return clone.size;
            default: return 0;
        }
    }

    idExists({ ID }) { return !!this.clones[ID]; }
    getData({ KEY, ID }) { return this.cloneData[ID]?.[KEY] ?? ''; }
    getAllIDs() { return `[${this.allIdsList.join(',')}]`; }

    // ===== HELPERS =====
    updateAllIdsList() { this.allIdsList = Object.keys(this.clones).map(id => Number(id)); }
    reset() { this.clones = {}; this.cloneData = {}; this.freeIds = []; this.nextId = 1; this.updateAllIdsList(); }
}

Scratch.extensions.register(new CloneIDs());
