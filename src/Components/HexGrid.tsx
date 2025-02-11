import { ipcRenderer } from 'electron';
import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppContext } from '../AppContext';
import usePrevious from '../Hooks/usePrevious';
import { getControlValue, KeyMap } from '../Types';
import { Canvas } from '../utils/canvas';
import { getNoteParts, hexNotes, indexFromNote, noteArray, noteFromIndex, NumHexes } from '../utils/elysiumutils';
import Point from '../utils/point';
import { confirmPrompt } from '../utils/utils';


interface Props
{
    layerIndex: number;
    size?: number;
}

type DragType = "copy" | "move" | "none";

export default function(props: Props)
{
    const { state, dispatch } = useContext(AppContext)!;

    const canvasEl = useRef<HTMLCanvasElement | null>(null);
    const canvas = useRef<Canvas | null>(null);
    const backCanvasEl = useRef<HTMLCanvasElement | null>(null);
    const backCanvas = useRef<Canvas | null>(null);
    const hexCanvasEl = useRef<HTMLCanvasElement | null>(null);
    const hexCanvas = useRef<Canvas | null>(null);
    const hexPoints = useRef<Point[]>([]);
    const mouseLocation = useRef<Point | null>(null);

    const rows = 12;
    const cols = 17;
    const start = noteArray.indexOf("D#") + noteArray.length * 7;
    const hexRadius = 38;
    const lineWidth = 2;
    const startPosition = new Point(hexRadius + lineWidth / 2, hexRadius + lineWidth / 2);
    const animationFrameHandle = useRef<number | null>(null);
    const animationCallback = useRef<() => any>(() => 0);

    const layerIsSelected = state.selectedHex.layerIndex === props.layerIndex;
    const hexIsSelected = state.selectedHex.hexIndex !== -1 && layerIsSelected;

    function closestHexIndex(point: Point)
    {
        let hexIndex = -1;
        let closestDist = hexRadius;
        
        hexPoints.current.forEach((hexPoint, i) =>
        {
            const dist = point.distanceTo(hexPoint)
            if (dist < closestDist)
            {
                closestDist = dist;
                hexIndex = i;
            }
        });

        return hexIndex;
    }

    useEffect(() =>
    {
        function keyDown(e: KeyboardEvent)
        {
            if (!hexIsSelected) return;

            if (e.key === "Delete" && state.layers[props.layerIndex].tokenIds[state.selectedHex.hexIndex].length > 0)
            {
                if (state.settings.confirmDelete)
                {
                    confirmPrompt(
                        "Are you sure you want to clear that hex?",
                        "Confirm clear hex",
                        (confirmed) =>
                        {
                            if (confirmed)
                            {
                                dispatch({ type: "clearHex", payload: { layerIndex: props.layerIndex, hexIndex: state.selectedHex.hexIndex }});
                            }
                        }
                    );
                }
                else
                {
                    dispatch({ type: "clearHex", payload: { layerIndex: props.layerIndex, hexIndex: state.selectedHex.hexIndex }});
                }
            }
            else if ([...e.key].length === 1 && !e.ctrlKey && !e.shiftKey)
            {
                for (const uid in state.settings.tokens)
                {
                    if (state.settings.tokens[uid].shortcut.toLowerCase() === e.key.toLowerCase())
                    {
                        if (e.altKey)
                        {
                            const tokenIds = state.layers[props.layerIndex].tokenIds[state.selectedHex.hexIndex];
                            const tokenToRemove = tokenIds.slice(0).reverse().find(iid => state.tokens[iid].uid === uid);
                            if (tokenToRemove)
                            {
                                dispatch({ type: "removeTokenFromHex", payload: { tokenId: tokenToRemove, hexIndex: state.selectedHex.hexIndex, layerIndex: props.layerIndex } })
                            }
                        }
                        else
                        {
                            dispatch({ type: "addTokenToHex", payload: { tokenUid: uid, hexIndex: state.selectedHex.hexIndex, layerIndex: props.layerIndex } });
                        }
                    }
                }
            }
        }

        canvasEl.current?.addEventListener("keydown", keyDown);

        return () => canvasEl.current?.removeEventListener("keydown", keyDown);
    });

    useEffect(() =>
    {
        canvas.current = new Canvas({
            align: { horizontal: true, vertical: true },
            canvasElement: canvasEl.current!,
            deepCalc: true,
            opaque: false,
            pixelated: false,
            size: new Point(hexRadius * 2 * cols / 1.3076923076923077 + lineWidth * 2 + 1, hexRadius * 2 * rows / 1.0971428571428572 + lineWidth * 2 + 1).rounded
        });

        backCanvas.current = new Canvas({
            canvasElement: backCanvasEl.current!,
            deepCalc: false,
            opaque: true,
            pixelated: false,
            size: canvas.current.size
        });

        hexCanvas.current = new Canvas({
            canvasElement: hexCanvasEl.current!,
            deepCalc: false,
            opaque: false,
            pixelated: false,
            size: canvas.current.size
        });

        backCanvas.current.fill("#221922");
        const pts = hexCanvas.current.drawHexagonGrid(
            startPosition,
            hexRadius,
            new Point(cols, rows),
            false,
            "#DDBBDD",
            lineWidth
        );

        if (pts)
        {
            hexPoints.current = pts;
        }

        function anim()
        {
            animationCallback.current();

            if (animationFrameHandle.current !== null)
            {
                animationFrameHandle.current = requestAnimationFrame(anim);
            }
        }

        animationFrameHandle.current = requestAnimationFrame(anim);

        return () =>
        {
            if (animationFrameHandle.current !== null) cancelAnimationFrame(animationFrameHandle.current);
            animationFrameHandle.current = null;
        };

    }, []);

    ////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////// FRONT CANVAS /////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    useEffect(() =>
    {
        canvas.current?.clear();
        canvas.current?.drawHexagonGridDecorations(
            startPosition,
            hexRadius,
            new Point(cols, rows),
            false,
            "#ffccff",
            hexNotes.map((hexNote, i) =>
            {
                const symbols = state.layers[props.layerIndex].tokenIds[i].map(tokenId => state.tokens[tokenId].symbol);
                return symbols.length > 0 ? hexNote + "\n" + symbols.join("") : hexNote;
            }),
            hexNotes.map((hexNote, i) =>
            {
                const tokens = state.layers[props.layerIndex].tokenIds[i]
                    .map(tokenId => state.tokens[tokenId]);

                const ret: number[] = [];

                tokens.forEach((token) =>
                {
                    const controls = token.controlIds.map(cid => state.controls[cid]);
                    controls.filter(c => c.type === "direction").forEach(c => ret.push(getControlValue(state, props.layerIndex, c)));
                });

                return ret;
            })
        );
    }, [ state.selectedHex.layerIndex, Math.floor(state.layers[props.layerIndex].currentBeat), state.controls, state.layers[props.layerIndex].tokenIds ]);

    ////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////// EVENTS ////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    useEffect(() =>
    {
        const mouseUp = (pos : Point, originalPos : Point, e : MouseEvent | TouchEvent) =>
        {
            if (state.isDragging && state.draggingDestHex.layerIndex !== -1 && state.draggingDestHex.hexIndex !== -1 &&
                !(state.draggingSourceHex.hexIndex === state.draggingDestHex.hexIndex && state.draggingSourceHex.layerIndex === state.draggingDestHex.layerIndex))
            {
                const destIndex = closestHexIndex(pos);
                if (destIndex !== -1)
                {
                    dispatch({ type: state.draggingType === "copy" ? "copyHex" : "moveHex", payload: {
                        srcLayerIndex: state.draggingSourceHex.layerIndex,
                        destLayerIndex: state.draggingDestHex.layerIndex,
                        srcHexIndex: state.draggingSourceHex.hexIndex,
                        destHexIndex: state.draggingDestHex.hexIndex
                    }});
                    dispatch({ type: "setSelectedHex", payload: { layerIndex: props.layerIndex, hexIndex: destIndex } });
                }
                // dispatch({ type: "setIsDragging", payload: false });
            }
        };

        function documentMouseUp()
        {
            dispatch({ type: "setIsDragging", payload: false });
            dispatch({ type: "setDraggingDestHex", payload: { hexIndex: -1, layerIndex: -1 }});
            document.body.style.cursor = "default";
        }

        function mouseDown(pos: Point, e: MouseEvent | TouchEvent)
        {
            const hexIndex = closestHexIndex(pos);
            if (hexIndex !== -1)
            {
                dispatch({ type: "setSelectedHex", payload: { hexIndex, layerIndex: props.layerIndex } });
    
                if (state.layers[props.layerIndex].tokenIds[hexIndex].length !== 0)
                {
                    dispatch({ type: "setDraggingSourceHex", payload: { hexIndex: hexIndex, layerIndex: props.layerIndex }});
                    dispatch({ type: "setIsDragging", payload: true });
                    dispatch({ type: "setDraggingType", payload: e.shiftKey ? "copy" : "move"});
                }
            }
        }

        function mouseMove(pos: Point, isDown: boolean, lastPos: Point, originalPos: Point, e: MouseEvent | TouchEvent)
        {
            mouseLocation.current = pos;
        }

        animationCallback.current = () =>
        {
            if (state.isDragging && mouseLocation.current)
            {
                const hoveredHex = closestHexIndex(mouseLocation.current);
                if (hoveredHex !== -1 && !(hoveredHex === state.draggingSourceHex.hexIndex && props.layerIndex === state.draggingSourceHex.layerIndex))
                {
                    dispatch({ type: "setDraggingDestHex", payload: { hexIndex: hoveredHex, layerIndex: props.layerIndex }});
                    document.body.style.cursor = (state.draggingType === "copy" ? "copy" : "move");
                }
                else
                {
                    dispatch({ type: "setDraggingDestHex", payload: { hexIndex: -1, layerIndex: -1 }});
                }
            };
        }

        function mouseLeave(pos : Point, e : MouseEvent | TouchEvent)
        {
            dispatch({ type: "setDraggingDestHex", payload: { hexIndex: -1, layerIndex: -1 }});
            mouseLocation.current = null;
        }

        function contextMenu(e: MouseEvent)
        {
            e.preventDefault();
            if (hexIsSelected)
            {
                const defs = Object.entries(state.tokenDefinitions);
                const addItems = defs.map(([ path, def ]) => 
                {
                    return {
                        label: "Add " + def.label + (state.settings.tokens[def.uid].enabled ? "" : " (disabled)"),
                        value: "add-" + path
                    };
                });

                const removeItems = state.layers[props.layerIndex].tokenIds[state.selectedHex.hexIndex].map((tokenId) =>
                {
                    return {
                        label: "Remove " + state.tokens[tokenId].label,
                        value: "remove-" + tokenId
                    };
                });

                ipcRenderer.send("show-context-menu", [ ...addItems, { label: "---", value: "---" }, ...removeItems ]);
            }
        }

        function handleContextMenuCommand(e: Electron.IpcRendererEvent, value: string)
        {
            if (hexIsSelected)
            {
                if (value.startsWith("add-"))
                {
                    const path = value.substr(4);
                    dispatch({ type: "addTokenToSelected", payload: { tokenKey: path }});
                }
                else if (value.startsWith("remove-"))
                {
                    const tokenId = value.substr(7);
                    dispatch({ type: "removeTokenFromHex", payload: { ...state.selectedHex, tokenId } });
                }
            }
        }

        canvas.current?.addEventListener("mousemove", mouseMove);
        canvas.current?.addEventListener("mousedown", mouseDown);
        canvas.current?.addEventListener("mouseup", mouseUp);
        canvas.current?.addEventListener("mouseleave", mouseLeave);
        document.body.addEventListener("mouseup", documentMouseUp);
        canvas.current?.canvas.addEventListener("contextmenu", contextMenu);
        ipcRenderer.addListener("context-menu-command", handleContextMenuCommand);

        return () =>
        {
            canvas.current?.removeEventListener("mousemove", mouseMove);
            canvas.current?.removeEventListener("mousedown", mouseDown);
            canvas.current?.removeEventListener("mouseup", mouseUp);
            canvas.current?.removeEventListener("mouseleave", mouseLeave);
            document.body.removeEventListener("mouseup", documentMouseUp);
            canvas.current?.canvas.removeEventListener("contextmenu", contextMenu);
            ipcRenderer.removeListener("context-menu-command", handleContextMenuCommand);
        }
    });

    /////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////// BACK CANVAS //////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////
    useEffect(() =>
    {
        backCanvas.current?.fill("#221922");
        // draw selected //
        // if (prevSelectedHex !== -1 && prevSelectedHex !== undefined && backCanvas.current)
        // {
        //     backCanvas.current.fillHexagonCell(startPosition, new Point(~~(prevSelectedHex / rows), prevSelectedHex % rows), hexRadius, false, "#221922");
        // }

        // draw key //
        // console.log(state);
        const key: keyof typeof KeyMap = getControlValue(state, props.layerIndex, state.controls[state.layers[props.layerIndex].key]);
        if (key !== "None")
        {
            const notes = KeyMap[key].map(ni => noteArray[ni]);
            for (let i = 0; i < NumHexes; i++)
            {
                const hexNote = getNoteParts(hexNotes[i]).name;
                if (notes.includes(hexNote))
                {
                    backCanvas.current?.fillHexagonCell(startPosition, new Point(~~(i / rows), i % rows), hexRadius, false, "#005555");
                }
            }
        }

        // draw selected //
        if (hexIsSelected)
        {
            backCanvas.current?.fillHexagonCell(startPosition, new Point(~~(state.selectedHex.hexIndex / rows), state.selectedHex.hexIndex % rows), hexRadius, false, "#702570");
        }


        // draw midi notes //
        if (props.layerIndex === state.selectedHex.layerIndex)
        {
            state.midiNotes.forEach((note) =>
            {
                const toPlay: { hexIndex: number, velocity: number }[] = [];
    
                for (let i = 0; i < hexNotes.length; i++)
                {
                    if (note.isOn && hexNotes[i] === note.name)
                    {
                        toPlay.push({ hexIndex: i, velocity: note.velocity });
                    }
                }
    
                toPlay.forEach((data) =>
                {
                    backCanvas.current?.fillHexagonCell(
                        startPosition, 
                        new Point(~~(data.hexIndex / rows), data.hexIndex % rows),
                        hexRadius,
                        false,
                        `rgba(40,${90 + (data.velocity / 127 * 20)},${30 + (data.velocity / 127 * 60)},${(data.velocity / 127) * 0.8 + 0.2})`
                    );
                });
            });
        }

        // draw dragging //
        if (state.isDragging && state.draggingDestHex.hexIndex !== -1 && state.draggingDestHex.layerIndex === props.layerIndex)
        {
            backCanvas.current?.fillHexagonCell(startPosition, new Point(~~(state.draggingDestHex.hexIndex / rows), state.draggingDestHex.hexIndex % rows), hexRadius, false, "#00A");
        }

        // draw playheads //
        state.layers[props.layerIndex].playheads.forEach((hex, hexIndex) =>
        {
            if (hex.length > 0)
            {
                if (hex.some(p => p.age >= p.lifespan))
                {
                    // dying //
                    backCanvas.current?.fillHexagonCell(startPosition, new Point(~~(hexIndex / rows), hexIndex % rows), hexRadius, false, "#880000");
                }
                else
                {
                    backCanvas.current?.fillHexagonCell(startPosition, new Point(~~(hexIndex / rows), hexIndex % rows), hexRadius, false, "#FF0000");
                }
            }
        });
    }, [ state.selectedHex, state.layers, props.layerIndex, state.draggingDestHex, state.isDragging, state.midiNotes ]);

    // useEffect(() =>
    // {
    //     if (!canvas.current || state.selectedHex === -1) return;

    //     const tokens = state.layers[props.layerIndex].tokenIds[state.selectedHex].map(tid => state.tokens[tid]);
    //     const symbols = tokens.map(t => t.symbol).join("");
    //     const directions: number[] = [];

    //     tokens.forEach((token) =>
    //     {
    //         token.controlIds.forEach((controlId) =>
    //         {
    //             const control = state.controls[controlId];
    //             if (control.type === "direction")
    //             {
    //                 directions.push(getControlValue(state, control));
    //             }
    //         });
    //     });

    //     canvas.current.blendMode = "destination-out";
    //     canvas.current.fillHexagonCell(startPosition, new Point(~~(state.selectedHex / rows), state.selectedHex % rows), hexRadius, false, "#221922");
    //     canvas.current.blendMode = "source-over";
    //     canvas.current.drawHexagonCell(startPosition, new Point(~~(state.selectedHex / rows), state.selectedHex % rows),
    //         hexRadius, false, "white", lineWidth, `${hexNotes[state.selectedHex]}${symbols.length > 0 ? "\n" + symbols : ""}`, directions);
    // }, [ state.controls ]);

    const style = props.size ? { width: props.size + "px", height: "auto" } : undefined;

    return (
        <div className="hexGrid">
            <canvas ref={backCanvasEl} style={style}></canvas>
            <canvas ref={hexCanvasEl} style={style}></canvas>
            <canvas tabIndex={0} ref={canvasEl} draggable={false} style={style}></canvas>
        </div>
    );
}