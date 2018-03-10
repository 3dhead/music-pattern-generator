export default function createReducers() {

    const initialState = {
            processors: {
                byId: {},
                allIds: []
            },
            connections: {
                byId: {},
                allIds: []
            },
            ports: {
                byId: {},
                allIds: []
            },
            types: {
                byId: {},
                allIds: []
            },
            bpm: 120,
            selectedID: null,
            theme: 'dev', // 'light|dark' 
            transport: 'stop', // 'play|pause|stop'
            connectModeActive: false,
            learnModeActive: false,
            learnTargetProcessorID: null,
            learnTargetParameterKey: null,
            showHelpPanel: false,
            showPreferencesPanel: false,
            showSettingsPanel: false,
        },
        
        reduce = function(state = initialState, action = {}, actions = {}) {
            let newState;
            switch(action.type) {

                case actions.NEW_PROJECT:
                    return { 
                        ...initialState,
                        ports: state.ports
                    };

                case actions.SET_PROJECT:
                    console.log({ ...state, ...action.data });
                    return { ...state, ...action.data };

                case actions.SET_THEME:
                    return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };

                case actions.ADD_PROCESSOR:
                    newState = { 
                        ...state,
                        processors: {
                            byId: { 
                                ...state.processors.byId,
                                [action.data.id]: action.data
                            },
                            allIds: [ ...state.processors.allIds ]
                        } };

                    // array index depends on processor type
                    let numInputProcessors = newState.processors.allIds.filter(id => { newState.processors.byId[id].type === 'input' }).length;
                    switch (action.data.type) {
                        case 'input':
                            newState.processors.allIds.unshift(action.data.id);
                            numInputProcessors++;
                            break;
                        case 'output':
                            newState.processors.allIds.push(action.data.id);
                            break;
                        default:
                            newState.processors.allIds.splice(numInputProcessors, 0, action.data.id);
                            newState.showSettingsPanel = true;

                    }
                    return newState;
                
                case actions.DELETE_PROCESSOR:
                    const index = state.processors.allIds.indexOf(action.id);
                    
                    // delete the processor
                    newState = { 
                        ...state,
                        processors: {
                            byId: { ...state.processors.byId },
                            allIds: state.processors.allIds.filter(id => id !== action.id)
                        } };
                    delete newState.processors.byId[action.id];
                    
                    // delete all connections to and from the deleted processor
                    newState.connections = {
                        byId: { ...state.connections.byId },
                        allIds: [ ...state.connections.allIds ]
                    }
                    for (let i = newState.connections.allIds.length -1, n = 0; i >= n; i--) {
                        const connectionID = newState.connections.allIds[i];
                        const connection = newState.connections.byId[connectionID];
                        if (connection.sourceProcessorID === action.id || connection.destinationProcessorID === action.id) {
                            newState.connections.allIds.splice(i, 1);
                            delete newState.connections.byId[connectionID];
                        }
                    }

                    // select the next processor, if any, or a previous one
                    let newIndex;
                    if (newState.selectedID === action.id && newState.processors.allIds.length) {
                        if (newState.processors.allIds[index]) {
                            newIndex = index;
                        } else if (index > 0) {
                            newIndex = index - 1;
                        } else {
                            newIndex = 0;
                        }
                        newState.selectedID = newState.processors.allIds[newIndex];
                    }
                    return newState;
                
                case actions.SELECT_PROCESSOR:
                    return Object.assign({}, state, {
                        selectedID: action.id
                    });
                
                case actions.DRAG_SELECTED_PROCESSOR:
                    newState = { 
                        ...state,
                        processors: {
                            byId: { ...state.processors.byId },
                            allIds: [ ...state.processors.allIds ]
                        } };
                    newState.processors.byId[newState.selectedID].positionX = action.x;
                    newState.processors.byId[newState.selectedID].positionY = action.y;
                    return newState;

                case actions.DRAG_ALL_PROCESSORS:
                    newState = { 
                        ...state,
                        processors: {
                            byId: { ...state.processors.byId },
                            allIds: [ ...state.processors.allIds ]
                        } };
                    newState.processors.allIds.forEach(id => {
                        newState.processors.byId[id].positionX += action.x;
                        newState.processors.byId[id].positionY += action.y;
                    });
                    return newState;
                
                case actions.CHANGE_PARAMETER:
                    newState = { 
                        ...state,
                        processors: {
                            byId: { ...state.processors.byId },
                            allIds: [ ...state.processors.allIds ]
                        } };
                    const param = newState.processors.byId[action.processorID].params.byId[action.paramKey];
                    switch (param.type) {
                        case 'integer':
                            param.value = Math.max(param.min, Math.min(action.paramValue, param.max));
                            break;
                        case 'boolean':
                            param.value = !!action.paramValue;
                            break;
                        case 'itemized':
                            param.value = action.paramValue;
                            break;
                        case 'string':
                            param.value = action.paramValue;
                            break;
                    }
                    return newState;
                
                case actions.RECREATE_PARAMETER:
                    // clone state
                    newState = { 
                        ...state,
                        processors: {
                            byId: { ...state.processors.byId },
                            allIds: [ ...state.processors.allIds ]
                        } };
                    
                    // clone parameter, overwrite with new settings.
                    newState.processors.byId[action.processorID].params.byId[action.paramKey] = {
                        ...newState.processors.byId[action.processorID].params.byId[action.paramKey],
                        ...action.paramObj
                    };
                    
                    return newState;
                
                case actions.SET_TEMPO:
                    return Object.assign({}, state, { bpm: action.value });
                
                case actions.MIDI_PORT_CHANGE:
                    newState = { 
                        ...state,
                        ports: {
                            byId: { ...state.ports.byId },
                            allIds: [ ...state.ports.allIds ]
                    }};
                    
                    if (state.ports.byId[action.midiPort.id]) {
                        // update existing port
                        newState.ports.byId[action.midiPort.id] = {
                            ...state.ports.byId[action.midiPort.id],
                            connection: action.midiPort.connection,
                            state: action.midiPort.state
                        }
                    } else {
                        // add new port
                        newState.ports.byId[action.midiPort.id] = {
                            id: action.midiPort.id, 
                            type: action.midiPort.type,
                            name: action.midiPort.name,
                            connection: action.midiPort.connection,
                            state: action.midiPort.state,
                            networkEnabled: false,
                            syncEnabled: false,
                            remoteEnabled: false
                        }
                        newState.ports.allIds.push(action.midiPort.id);
                        newState.ports.allIds.sort((a, b) => {
                            if (a.name < b.name) { return -1 }
                            if (a.name > b.name) { return 1 }
                            return 0;
                        });
                    }
                    return newState;
                
                case actions.TOGGLE_PORT_SYNC:
                    return toggleMIDIPreference(state, action.id, 'syncEnabled');
                
                case actions.TOGGLE_PORT_REMOTE:
                    return toggleMIDIPreference(state, action.id, 'remoteEnabled');
                
                case actions.TOGGLE_MIDI_PREFERENCE:
                    return toggleMIDIPreference(state, action.id, action.preferenceName);
                
                case actions.TOGGLE_MIDI_LEARN_MODE:
                    return Object.assign({}, state, { 
                        learnModeActive: !state.learnModeActive });
                
                case actions.TOGGLE_MIDI_LEARN_TARGET:
                    return Object.assign({}, state, { 
                        learnTargetProcessorID: action.processorID, 
                        learnTargetParameterKey: action.parameterKey 
                    });
                
                case actions.SET_TRANSPORT:
                    let value = action.command;
                    if (action.command === 'toggle') {
                        value = state.transport === 'play' ? 'pause' : 'play';
                    }
                    return Object.assign({}, state, { 
                        transport: value
                    });

                case actions.ASSIGN_EXTERNAL_CONTROL:
                    if (state.learnModeActive && state.learnTargetProcessorID && state.learnTargetParameterKey) {
                        newState = { 
                            ...state,
                            processors: {
                                allIds: [ ...state.processors.allIds ],
                                byId: { ...state.processors.byId }
                            } };
                        newState.processors.byId[state.learnTargetProcessorID].params.byId = assignParameter(newState.processors.byId[state.learnTargetProcessorID].params.byId, action, state);
                        return newState;
                    }
                    return state;

                case actions.UNASSIGN_EXTERNAL_CONTROL:
                    if (state.learnModeActive && state.learnTargetProcessorID && state.learnTargetParameterKey) {
                        newState = { 
                            ...state,
                            processors: {
                                allIds: [ ...state.processors.allIds ],
                                byId: { ...state.processors.byId }
                            } };
                        newState.processors.byId[state.learnTargetProcessorID].params.byId = unassignParameter(newState.processors.byId[state.learnTargetProcessorID].params.byId, action, state);
                        return newState;
                    }
                    return state;
                
                case actions.TOGGLE_PANEL:
                    return {
                        ...state,
                        showHelpPanel: action.panelName === 'help' ? !state.showHelpPanel : state.showHelpPanel,
                        showPreferencesPanel: action.panelName === 'preferences' ? !state.showPreferencesPanel : state.showPreferencesPanel,
                        showSettingsPanel: action.panelName === 'settings' ? !state.showSettingsPanel : state.showSettingsPanel
                    };
                    return state;
                
                case actions.TOGGLE_CONNECT_MODE:
                    return {
                        ...state,
                        connectModeActive: !state.connectModeActive
                    };
                
                case actions.CONNECT_PROCESSORS:
                    // abort if the connection already exists
                    for (let i = 0, n = state.connections.allIds.length; i < n; i++) {
                        const connection = state.connections.byId[state.connections.allIds[i]];
                        if (connection.sourceProcessorID === action.payload.sourceProcessorID &&
                            connection.sourceConnectorID === action.payload.sourceConnectorID &&
                            connection.destinationProcessorID === action.payload.destinationProcessorID &&
                            connection.destinationConnectorID === action.payload.destinationConnectorID) {
                            return state;
                        } 
                    }
                    // add new connection
                    newState = {
                        ...state,
                        connections: {
                            byId: { ...state.connections.byId, [action.id]: action.payload },
                            allIds: [ ...state.connections.allIds, action.id ]
                        },
                        processors: {
                            byId: { ...state.processors.byId },
                            allIds: [ ...state.processors.allIds ]
                        }
                    };
                    // reorder the processors
                    orderProcessors(newState);
                    return newState;
                
                case actions.DISCONNECT_PROCESSORS:
                    newState =  {
                        ...state,
                        connections: deleteFromNormalizedTable(state.connections, action.id),
                        processors: {
                            byId: { ...state.processors.byId },
                            allIds: [ ...state.processors.allIds ]
                        }
                    };
                    // reorder the processors
                    orderProcessors(newState);
                    return newState;

                case actions.RESCAN_TYPES:
                    return {
                        ...state,
                        types: {
                            allIds: Object.keys(action.types),
                            byId: action.types
                        }
                    };

                default:
                    return state;
            }
        };
    
    return {
        reduce: reduce
    }
}

// function addToNormalizedTable(stateObj, newItemID, newItem) {
//     const clone = {
//         byId: { ...stateObj.byId, [newItemID]: newItem },
//         allIds: [ ...stateObj.allIds, newItemID ]
//     };
//     return clone;
// }

function deleteFromNormalizedTable(table, id) {
    const clone = {
        byId: { ...table.byId },
        allIds: table.allIds.filter(iid => iid !== id)
    };
    delete clone.byId[id];
    return clone;
}
 
function assignParameter(parameters, action, state) {
    const params = { ...parameters };
    params[state.learnTargetParameterKey].remoteChannel = (action.data[0] & 0xf) + 1;
    params[state.learnTargetParameterKey].remoteCC = action.data[1];
    return params;
}

function unassignParameter(parameters, action, state) {
    const params = { ...parameters };
    params[action.paramKey].remoteChannel = null;
    params[action.paramKey].remoteCC = null;
    return params;
}

function toggleMIDIPreference(state, id, preferenceName) {
    const newState = {
        ...state,
        ports: {
            allIds: [ ...state.ports.allIds ],
            byId: { ...state.ports.byId }
        }
    };
    newState.ports.byId[id] = {
        ...newState.ports.byId[id],
        [preferenceName]: !state.ports.byId[id][preferenceName]
    };
    return newState;
}

/**
 * Order thee processors according to their connections
 * to optimise the flow from inputs to outputs.
 * 
 * Rule: when connected, the source goes before the destination
 * 
 * @param {Object} state The whole state object.
 */
function orderProcessors(state) {
    state.processors.allIds.sort((a, b) => {
        let compareResult = 0;
        // look for connections
        state.connections.allIds.forEach(id => {
            const connection = state.connections.byId[id];
            if (connection.sourceProcessorID === a && connection.destinationProcessorID === b) {
                // source A connects to destination B
                compareResult = -1;
            } else if (connection.sourceProcessorID === b && connection.destinationProcessorID === a) {
                // source B connects to destination A
                compareResult = 1;
            }
        });
        return compareResult;
    });
}
