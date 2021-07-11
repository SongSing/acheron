import { ControlState, ControlDefinition, Lfo, SelectOption, ControlDataType } from "../Types";
import { AppState } from "../AppContext";
import { v4 as uuidv4 } from 'uuid';

// ----------------------------------------------------------------
// PLAYER
// ----------------------------------------------------------------

export const PlayerControlKeys = [
    "transpose",
    "barLength",
    "tempo",
    "velocity",
    "emphasis",
    "noteLength",
    "timeToLive",
    "pulseEvery"
] as const;

export type PlayerControlKey = typeof PlayerControlKeys[number];

const playerControlDefs: Record<PlayerControlKey, ControlDefinition> = {
    transpose: {
        label: "Transpose",
        type: "int",
        min: -24,
        max: 24,
        defaultValue: 0,
    },
    barLength: {
        label: "Bar Length",
        type: "int",
        min: 1,
        max: 12,
        defaultValue: 4,
    },
    tempo: {
        label: "Tempo",
        type: "int",
        min: 1,
        max: 300,
        defaultValue: 120,
    },
    velocity: {
        label: "Velocity",
        type: "int",
        min: 0,
        max: 127,
        defaultValue: 90,
    },
    emphasis: {
        label: "Emphasis",
        type: "int",
        min: 1,
        max: 200,
        defaultValue: 120,
    },
    noteLength: {
        label: "Note Length",
        type: "decimal",
        min: 0.1,
        max: 10,
        defaultValue: 0.6,
        step: 0.1
    },
    timeToLive: {
        label: "Time to Live",
        type: "int",
        min: 1,
        max: 64,
        defaultValue: 16,
    },
    pulseEvery: {
        label: "Pulse Every",
        type: "int",
        min: 1,
        max: 64,
        defaultValue: 16,
    }
};

export const DefaultPlayerControls = buildFromDefs(playerControlDefs);

// ----------------------------------------------------------------
// LAYER
// ----------------------------------------------------------------

export const LayerControlTypes = [
    "barLength",
    "emphasis",
    "tempo",
    "transpose",
    "velocity",
    "noteLength",
    "pulseEvery",
    "timeToLive"
] as const;

export type LayerControlKey = typeof LayerControlTypes[number];

const layerControlDefs: Record<LayerControlKey, ControlDefinition> = {
    barLength: {
        inherit: "global.barLength"
    },
    emphasis: {
        inherit: "global.emphasis"
    },
    tempo: {
        inherit: "global.tempo"
    },
    transpose: {
        inherit: "global.transpose"
    },
    velocity: {
        inherit: "global.velocity"
    },
    noteLength: {
        inherit: "global.noteLength"
    },
    pulseEvery: {
        inherit: "global.pulseEvery"
    },
    timeToLive: {
        inherit: "global.timeToLive"
    }
};

export function DefaultLayerControls(): Record<string, ControlState>
{
    return buildFromDefs(layerControlDefs)
}

// ------------------------------

// ----------------------------------------------------------------

export function buildFromDefs(defs: Record<string, ControlDefinition>): Record<string, ControlState>
{
    const parts: Record<string, ControlState> = {};

    function getDefaultValue(definition: ControlDefinition)
    {
        switch (definition.type)
        {
            case "bool":
                return definition.defaultValue ?? false;
            case "int":
            case "decimal":
            case "direction":
            case "triad":
                return definition.defaultValue ?? 0;
            case "select":  
                if (!definition.options)
                {
                    throw "select control without options :(";
                }

                const defaultOption = definition.options.find(o => o.value === definition.defaultValue);
                if (defaultOption)
                {
                    return defaultOption.value;
                }
                else
                {
                    return definition.options[0].value;
                }
        }
    }

    function reportError(msg: string)
    {
        console.error("Error building token control:\n" + msg);
    }
    
    for (const key in defs)
    {
        if (defs[key].inherit)
        {
            const inheritParts = defs[key].inherit!.split(".");
            if (inheritParts.length !== 2)
            {
                reportError("bad");
            }
            
            if (!["global","layer"].includes(inheritParts[0]))
            {
                reportError("bad");
            }
            else
            {
                let inheritKey: PlayerControlKey | LayerControlKey = inheritParts[1] as PlayerControlKey | LayerControlKey;
                if ((inheritParts[0] === "global" ? LayerControlTypes : PlayerControlKeys).includes(inheritKey))
                {
                    let defaultControl = Object.entries(inheritParts[0] === "global" ? DefaultPlayerControls : DefaultLayerControls).find(e => e[1].key === inheritKey)![1];
                    if (defaultControl === null)
                    {
                        reportError("bad");
                    }
                    else
                    {
                        const id = uuidv4()
                        parts[id] = {
                            label: defaultControl.label,
                            type: defaultControl.type,
                            min: defaultControl.min,
                            max: defaultControl.max,
                            step: defaultControl.step,
                            options: defaultControl.options?.slice(0),
                            inherit: defaultControl.id,
                            scalarValue: defaultControl.scalarValue,
                            currentValueType: "inherit",
                            lfo: buildLfo(defaultControl.type, defaultControl.min, defaultControl.max, defaultControl.options),
                            id,
                            key
                        };
                    }
                }
                else
                {
                    reportError("bad");
                }
            }
        }
        else
        {
            const def = defs[key];

            if (def.label === undefined || def.type === undefined)
            {
                reportError("bad");
            }
            else
            {
                const id = uuidv4()
                parts[id] = {
                    label: def.label,
                    type: def.type,
                    step: def.step,
                    options: def.options?.slice(0),
                    inherit: undefined,
                    currentValueType: "scalar",
                    scalarValue: getDefaultValue(defs[key]),
                    lfo: buildLfo(def.type, def.min, def.max, def.options),
                    id,
                    key,
                    ...getMinMaxForType(def.type, def.min, def.max, def.options)
                };
            }
        }
    }

    return Object.freeze(parts);
}

function getMinMaxForType(type: ControlDataType, n_min?: number, n_max?: number, options?: SelectOption[])
{
    let max: number, min: number;

    switch (type)
    {
        case "bool":
            max = 1;
            min = 0;
            break;
        case "decimal":
        case "int":
            max = n_max ?? 16;
            min = n_min ?? 0;
            break;
        case "direction":
            max = 5;
            min = 0;
            break;
        case "triad":
            max = 6;
            min = 0;
            break;
        case "select":
            max = options!.length - 1;
            min = 0;
            break;
    }

    return { min, max };
}

export function buildLfo(type: ControlDataType, n_min?: number, n_max?: number, options?: SelectOption[])
{
    const { min, max } = getMinMaxForType(type, n_min, n_max, options);

    const lfo: Lfo = {
        period: 2,
        hiPeriod: 1,
        lowPeriod: 1,
        max,
        min,
        sequence: [],
        type: "sin"
    };

    return lfo;
}