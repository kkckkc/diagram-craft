import './App.css';
import { deserializeDiagramDocument, SerializedDiagram } from './model-viewer/serialization.ts';
import { ContextMenuEvent, EditableCanvas } from './react-canvas-editor/EditableCanvas.tsx';
import React, { useRef, useState } from 'react';
import { snapTestDiagram } from './sample/snap-test.ts';
import { simpleDiagram } from './sample/simple.ts';
import { EditableDiagram } from './model-editor/editable-diagram.ts';
import { LayerToolWindow } from './react-app/LayerToolWindow.tsx';
import { DocumentSelector } from './react-app/DocumentSelector.tsx';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  TbCategoryPlus,
  TbClick,
  TbDatabaseEdit,
  TbFiles,
  TbHistory,
  TbInfoCircle,
  TbLayoutGridAdd,
  TbLine,
  TbMenu2,
  TbMoon,
  TbPalette,
  TbPencil,
  TbPolygon,
  TbSelectAll,
  TbStack2,
  TbSun,
  TbTextSize,
  TbZoomIn,
  TbZoomOut
} from 'react-icons/tb';
import { CanvasContextMenu } from './react-app/context-menu/CanvasContextMenu.tsx';
import { ContextMenuDispatcher } from './react-app/context-menu/ContextMenuDispatcher.tsx';
import { SelectionContextMenu } from './react-app/context-menu/SelectionContextMenu.tsx';
import { Toolbar } from './react-app/toolbar/Toolbar.tsx';
import { DragDropManager } from './react-canvas-viewer/DragDropManager.tsx';
import { defaultEdgeRegistry, defaultNodeRegistry } from './react-canvas-viewer/defaultRegistry.ts';
import { SideBar } from './react-app/SideBar.tsx';
import { SideBarPage } from './react-app/SideBarPage.tsx';
import {
  canvasDragOverHandler,
  canvasDropHandler,
  PickerToolWindow
} from './react-app/PickerToolWindow.tsx';
import { ObjectProperties } from './react-app/ObjectProperties/ObjectProperties.tsx';
import { EdgeContextMenu } from './react-app/context-menu/EdgeContextMenu.tsx';
import { useEventListener } from './react-app/hooks/useEventListener.ts';
import { useRedraw } from './react-canvas-viewer/useRedraw.tsx';
import { defaultAppActions } from './react-app/appActionMap.ts';
import { defaultMacKeymap, makeActionMap } from './base-ui/keyMap.ts';
import { ObjectInfo } from './react-app/ObjectInfo/ObjectInfo.tsx';
import { DiagramEdge } from './model-viewer/diagramEdge.ts';
import { DiagramNode } from './model-viewer/diagramNode.ts';
import { DocumentTabs } from './react-app/components/DocumentTabs.tsx';
import { UserState } from './react-app/UserState.ts';
import { HistoryToolWindow } from './react-app/HistoryToolWindow.tsx';
import { Ruler } from './react-app/Ruler.tsx';

const factory = (d: SerializedDiagram, elements: (DiagramNode | DiagramEdge)[]) => {
  return new EditableDiagram(d.id, d.name, elements, defaultNodeRegistry(), defaultEdgeRegistry());
};

const diagrams = [
  {
    name: 'Snap test',
    document: deserializeDiagramDocument(snapTestDiagram, factory)
  },
  {
    name: 'Simple',
    document: deserializeDiagramDocument(simpleDiagram, factory)
  }
];

const DarkModeToggleButton = (props: { actionMap: Partial<ActionMap> }) => {
  const redraw = useRedraw();
  useEventListener('actionchanged', redraw, props.actionMap['TOGGLE_DARK_MODE']!);
  return (
    <button
      className={'cmp-toolbar__button'}
      onClick={() => props.actionMap['TOGGLE_DARK_MODE']?.execute()}
    >
      {props.actionMap['TOGGLE_DARK_MODE']?.state ? (
        <TbSun size={'1.1rem'} />
      ) : (
        <TbMoon size={'1.1rem'} />
      )}
    </button>
  );
};

const App = () => {
  const defaultDiagram = 1;
  const [doc, setDoc] = useState(diagrams[defaultDiagram].document);
  const [$d, setDiagram] = useState(diagrams[defaultDiagram].document.diagrams[0]);
  const contextMenuTarget = useRef<
    (ContextMenuEvent & React.MouseEvent<SVGSVGElement, MouseEvent>) | null
  >(null);
  /*
  useEffect(() => {
    perftest(new BezierPerformanceTest());
  }, []);
*/
  const actionMap = makeActionMap(defaultAppActions)({ diagram: $d });
  const keyMap = defaultMacKeymap;
  return (
    <div>
      <DragDropManager>
        <div id="app" className={'dark-theme'}>
          <div id="menu">
            <div className={'_menu-button'}>
              <div>
                <TbMenu2 size={'1.5rem'} />
              </div>
            </div>

            <div className={'_tools'}>
              <div className={'cmp-toolbar'} data-size={'large'}>
                <button className={'cmp-toolbar__toggle-item'} data-state={'on'}>
                  <TbClick size={'1.1rem'} />
                </button>
                <button className={'cmp-toolbar__toggle-item'}>
                  <TbLayoutGridAdd size={'1.1rem'} />
                </button>
                <button className={'cmp-toolbar__toggle-item'}>
                  <TbLine size={'1.1rem'} />
                </button>
                <button className={'cmp-toolbar__toggle-item'}>
                  <TbTextSize size={'1.1rem'} />
                </button>
                <button className={'cmp-toolbar__toggle-item'}>
                  <TbPencil size={'1.1rem'} />
                </button>
                <button className={'cmp-toolbar__toggle-item'}>
                  <TbPolygon size={'1.1rem'} />
                </button>
              </div>
            </div>

            <div className={'_document'}>
              <DocumentSelector
                diagrams={diagrams}
                defaultValue={defaultDiagram}
                onChange={d => {
                  setDoc(d);
                  setDiagram(d.diagrams[0]);
                }}
              />
            </div>

            <div className={'_extra-tools'}>
              <div className={'cmp-toolbar'}>
                <button
                  className={'cmp-toolbar__button'}
                  onClick={() => actionMap['ZOOM_IN']?.execute()}
                >
                  <TbZoomOut size={'1.1rem'} />
                </button>
                <button
                  className={'cmp-toolbar__button'}
                  onClick={() => actionMap['ZOOM_OUT']?.execute()}
                >
                  <TbZoomIn size={'1.1rem'} />
                </button>

                <DarkModeToggleButton actionMap={actionMap} />
              </div>
            </div>
          </div>
          <div id="window-area">
            <div id="toolbar">
              <Toolbar actionMap={actionMap} keyMap={keyMap} diagram={$d} />
            </div>

            <SideBar
              side={'left'}
              defaultSelected={UserState.getState()['panel.left'] ?? 0}
              onChange={idx => {
                UserState.set('panel.left', idx);
              }}
            >
              <SideBarPage icon={TbCategoryPlus}>
                <PickerToolWindow diagram={$d} />
              </SideBarPage>
              <SideBarPage icon={TbStack2}>
                <LayerToolWindow diagram={$d} />
              </SideBarPage>
              <SideBarPage icon={TbSelectAll}>TbSelectAll</SideBarPage>
              <SideBarPage icon={TbFiles}>TbFiles</SideBarPage>
              <SideBarPage icon={TbHistory}>
                <HistoryToolWindow diagram={$d} />
              </SideBarPage>
            </SideBar>

            <SideBar
              side={'right'}
              defaultSelected={UserState.getState()['panel.right'] ?? 0}
              onChange={idx => {
                UserState.set('panel.right', idx);
              }}
            >
              <SideBarPage icon={TbPalette}>
                <ObjectProperties diagram={$d} actionMap={actionMap} keyMap={keyMap} />
              </SideBarPage>
              <SideBarPage icon={TbInfoCircle}>
                <ObjectInfo diagram={$d} />
              </SideBarPage>
              <SideBarPage icon={TbDatabaseEdit}>TbDatabaseEdit</SideBarPage>
            </SideBar>

            <div id="canvas-area" className={'light-theme'}>
              <div id={'ruler-h'} className={'cmp-ruler'}>
                <Ruler orientation={'horizontal'} diagram={$d} />
              </div>
              <div id={'ruler-v'} className={'cmp-ruler'}>
                <Ruler orientation={'vertical'} diagram={$d} />
              </div>

              <ContextMenu.Root>
                <ContextMenu.Trigger asChild={true}>
                  <EditableCanvas
                    key={$d.id}
                    className={'canvas'}
                    diagram={$d}
                    onContextMenu={e => {
                      contextMenuTarget.current = e;
                    }}
                    actionMap={actionMap}
                    keyMap={keyMap}
                    onDrop={canvasDropHandler($d)}
                    onDragOver={canvasDragOverHandler()}
                  />
                </ContextMenu.Trigger>
                <ContextMenu.Portal>
                  <ContextMenu.Content className="cmp-context-menu dark-theme">
                    <ContextMenuDispatcher
                      state={contextMenuTarget}
                      createContextMenu={state => {
                        if (state.contextMenuTarget.type === 'canvas') {
                          return <CanvasContextMenu actionMap={actionMap} keyMap={keyMap} />;
                        } else if (state.contextMenuTarget.type === 'selection') {
                          return <SelectionContextMenu actionMap={actionMap} keyMap={keyMap} />;
                        } else {
                          return (
                            <EdgeContextMenu
                              actionMap={actionMap}
                              keyMap={keyMap}
                              target={state.contextMenuTarget}
                            />
                          );
                        }
                      }}
                    />
                  </ContextMenu.Content>
                </ContextMenu.Portal>
              </ContextMenu.Root>
            </div>

            <div id="tabs">
              <DocumentTabs
                value={$d.id}
                onValueChange={v => {
                  setDiagram(doc.getById(v)!);
                }}
                document={doc}
              />
            </div>
          </div>
        </div>
      </DragDropManager>
    </div>
  );
};

export default App;
