/* function for convert system values to Yandex (depends of capability or property type) */
function convertToYandexValue(val, actType) {
    switch(actType) {
        case 'range':
        case 'float': {
            if (val == undefined) return 0.0;
            try {
                const value = parseFloat(val);
                return isNaN(value) ? 0.0 : value;
            } catch {
                console.error(`Can't parse to float: ${val}`);
                return 0.0;
            }
        }
        case 'on_off': {
            if (val == undefined) return false;
            if (['true', 'on', '1'].indexOf(String(val).toLowerCase()) != -1) return true;
            else return false;
        }
        default:
            return val;
    }
}

/* Device class defenition */
class Device {
    constructor(options) {
        var id = global.devices.length;
        this.data = {
            id: options.id || String(id),
            name: options.name || 'Без названия',
            description: options.description || '',
            room: options.room || '',
            type: options.type || 'devices.types.light',
            custom_data: {
                mqtt: options.mqtt || [],
                valueMapping: options.valueMapping || [],
            },
            capabilities: (options.capabilities || []).map(c => Object.assign({}, c, {state: (c.state == undefined) ? this.initState(c) : c.state})),
            properties: (options.properties || []).map(p => Object.assign({}, p, {state: (p.state == undefined) ? this.initState(p) : p.state}))
        }
    }

    initState(cp) {
        const {type, parameters} = cp;
        const actType = String(type).split('.')[2];

        switch(actType) {
            case 'float': {
                return {
                    instance: parameters.instance,
                    value: 0
                }
            }
            case 'on_off': {
                return {
                    instance: 'on',
                    value: false
                }
            }
            case 'range': {
                return {
                    instance: parameters.instance,
                    value: parameters.range.min
                }
            }
            case 'mode': {
                return {
                    instance: parameters.instance,
                    value: parameters.modes[0].value
                }
            }
            default: {
                console.error(`Unsupported capability type: ${type}`)
                return undefined;
            }
        }

    }
    
    getInfo() {
        const {id, name, description, room, type, capabilities, properties} = this.data;
        return {id, name, description, room, type, capabilities, properties};
    }

    /* Find capability by type */
    findCapability(type) {
        return this.data.capabilities.find(c => c.type === type);
    }

    /* Unused for now */
    findProperty(type) {
        return this.data.properties.find(p => p.type === type);
    }

    /* Find topic by instance*/
    findTopicByInstance(instance) {
        return this.data.custom_data.mqtt.find(i => i.instance === instance).set;
    }

    /* Get mapped value (if exist) for capability type */
    /**
     * 
     * @param {*} val value
     * @param {*} actType capability type
     * @param {*} y2m mapping direction (yandex to mqtt, mqtt to yandex)
     */
    getMappedValue(val, actType, y2m) {
        const map = this.data.custom_data.valueMapping.find(m => m.type == actType);
        if (map == undefined) return val;
        
        var from, to;
        if (y2m == true) [from, to] = map.mapping;
        else [to, from] = map.mapping;
        
        const mappedValue = to[from.indexOf(val)];
        return (mappedValue != undefined) ? mappedValue : val;
    }

    /* Get only needed for response device info (bun not full device defenition) */
    getState () {
        const {id, capabilities, properties} = this.data;
        const device = {
            id,
            capabilities: (() => {
                return capabilities.filter(c => c.retrievable === true).map(c => {
                    return {
                        type: c.type,
                        state: c.state
                    }
                })
            })() || [],
            properties: (() => {
                return properties.filter(p => p.retrievable === true).map(p => {
                    return {
                        type: p.type,
                        state: p.state
                    }
                })
            })() || [],
        }

        return device;
    }

    /* Change device capability state and publish value to MQTT topic */
    setCapabilityState(val, type, instance) {
        const {id} = this.data;
        const actType = String(type).split('.')[2];
        const value = this.getMappedValue(val, actType, true);

        let message;
        let topic;
        try {
            const capability = this.findCapability(type);
            if (capability == undefined) throw new Error(`Can't find capability '${type}' in device '${id}'`);
            capability.state.value = value;
            topic = this.findTopicByInstance(instance);
            if (topic == undefined) throw new Error(`Can't find set topic for '${type}' in device '${id}'`);
            message = `${value}`;
        } catch(e) {              
            topic = false;
            console.log(e);
        }

        if (topic) {
            global.mqttClient.publish(topic, message);
        }

        return {
            type,
            'state': {
                instance,
                'action_result': {
                    'status': 'DONE'
                }
            }
        }
    }

    /* Update device capability or property state */
    updateState(val, instance) {
        const {id, capabilities, properties} = this.data;

        try {
            const cp = [].concat(capabilities, properties).find(cp => (cp.state.instance === instance))
            if (cp == undefined) throw new Error(`Can't instance '${instance}' in device '${id}'`);

            const actType = String(cp.type).split('.')[2];
            const value = this.getMappedValue(val, actType, false);
            cp.state = {instance, value: convertToYandexValue(value, actType)};
        } catch(e) {
            console.error(e);
        }
    }
}

module.exports = Device;
