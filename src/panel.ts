/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  overrideCursor
} from 'phosphor-domutil';

import {
  Message
} from 'phosphor-messaging';

import {
  Panel
} from 'phosphor-panel';

import {
  ChildMessage, Widget
} from 'phosphor-widget';

import {
  Orientation, SplitLayout
} from './layout';


/**
 * The class name added to SplitPanel instances.
 */
const SPLIT_PANEL_CLASS = 'p-SplitPanel';

/**
 * The class name added to split panel children.
 */
const CHILD_CLASS = 'p-SplitPanel-child';

/**
 * The class name added to split panel handles.
 */
const HANDLE_CLASS = 'p-SplitPanel-handle';


/**
 * A panel which arranges its children into resizable sections.
 *
 * #### Notes
 * This class provides a convenience wrapper around a [[SplitLayout]].
 */
export
class SplitPanel extends Panel {
  /**
   * Create a split layout for a split panel.
   */
  static createLayout(): SplitLayout {
    return new SplitLayout(this);
  }

  /**
   * Create a split handle for use in a split panel.
   *
   * #### Notes
   * This may be reimplemented to create custom split handles.
   */
  static createHandle(): HTMLElement {
    let handle = document.createElement('div');
    handle.className = HANDLE_CLASS;
    return handle;
  }

  /**
   * The static type of the constructor.
   */
  "constructor": typeof SplitPanel;

  /**
   * Construct a new split panel.
   */
  constructor() {
    super();
    this.addClass(SPLIT_PANEL_CLASS);
  }

  /**
   * Dispose of the resources held by the panel.
   */
  dispose(): void {
    this._releaseMouse();
    super.dispose();
  }

  /**
   * Get the layout orientation for the split panel.
   */
  get orientation(): Orientation {
    return (this.layout as SplitLayout).orientation;
  }

  /**
   * Set the layout orientation for the split panel.
   */
  set orientation(value: Orientation) {
    (this.layout as SplitLayout).orientation = value;
  }

  /**
   * Get the inter-element spacing for the split panel.
   */
  get spacing(): number {
    return (this.layout as SplitLayout).spacing;
  }

  /**
   * Set the inter-element spacing for the split panel.
   */
  set spacing(value: number) {
    (this.layout as SplitLayout).spacing = value;
  }

  /**
   * Get the normalized sizes of the widgets in the panel.
   *
   * @returns The normalized sizes of the widgets in the panel.
   */
  sizes(): number[] {
    return (this.layout as SplitLayout).sizes();
  }

  /**
   * Set the relative sizes for the child widgets in the panel.
   *
   * @param sizes - The relative sizes for the children in the panel.
   *   These values will be normalized to the available layout space.
   *
   * #### Notes
   * Extra values are ignored, too few will yield an undefined layout.
   */
  setSizes(sizes: number[]): void {
    (this.layout as SplitLayout).setSizes(sizes);
  }

  /**
   * Get the split handle for the widget at the given index.
   *
   * @param index - The index of the widget of interest.
   *
   * @returns The split handle for the widget, or `undefined`.
   */
  handleAt(index: number): HTMLElement {
    return (this.layout as SplitLayout).handleAt(index);
  }

  /**
   * Handle the DOM events for the split panel.
   *
   * @param event - The DOM event sent to the panel.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mousedown':
      this._evtMouseDown(event as MouseEvent);
      break;
    case 'mousemove':
      this._evtMouseMove(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseUp(event as MouseEvent);
      break;
    case 'keydown':
      this._evtKeyDown(event as KeyboardEvent);
      break;
    case 'keyup':
    case 'keypress':
    case 'contextmenu':
      // Stop all input events during drag.
      event.preventDefault();
      event.stopPropagation();
      break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('mousedown', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('mousedown', this);
    this._releaseMouse();
  }

  /**
   * A message handler invoked on a `'child-added'` message.
   */
  protected onChildAdded(msg: ChildMessage): void {
    msg.child.addClass(CHILD_CLASS);
    this._releaseMouse();
  }

  /**
   * A message handler invoked on a `'child-removed'` message.
   */
  protected onChildRemoved(msg: ChildMessage): void {
    msg.child.removeClass(CHILD_CLASS);
    this._releaseMouse();
  }

  /**
   * Handle the `'keydown'` event for the split panel.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    // Stop all input events during drag.
    event.preventDefault();
    event.stopPropagation();

    // Release the mouse if `Escape` is pressed.
    if (event.keyCode === 27) this._releaseMouse();
  }

  /**
   * Handle the `'mousedown'` event for the split panel.
   */
  private _evtMouseDown(event: MouseEvent): void {
    // Do nothing if the left mouse button is not pressed.
    if (event.button !== 0) {
      return;
    }

    // Find the handle which contains the target, if any.
    let layout = this.layout as SplitLayout;
    let target = event.target as HTMLElement;
    let { index, handle } = SplitPanelPrivate.findHandle(layout, target);
    if (index === -1) {
      return;
    }

    // Stop the event when a split handle is pressed.
    event.preventDefault();
    event.stopPropagation();

    // Add the extra document listeners.
    document.addEventListener('mouseup', this, true);
    document.addEventListener('mousemove', this, true);
    document.addEventListener('keydown', this, true);
    document.addEventListener('keyup', this, true);
    document.addEventListener('keypress', this, true);
    document.addEventListener('contextmenu', this, true);

    // Compute the offset delta for the handle press.
    let delta: number;
    let rect = handle.getBoundingClientRect();
    if (layout.orientation === Orientation.Horizontal) {
      delta = event.clientX - rect.left;
    } else {
      delta = event.clientY - rect.top;
    }

    // Override the cursor and store the press data.
    let style = window.getComputedStyle(handle);
    let override = overrideCursor(style.cursor);
    this._pressData = { index, delta, override };
  }

  /**
   * Handle the `'mousemove'` event for the split panel.
   */
  private _evtMouseMove(event: MouseEvent): void {
    // Stop the event when dragging a split handle.
    event.preventDefault();
    event.stopPropagation();

    // Compute the desired offset position for the handle.
    let pos: number;
    let layout = this.layout as SplitLayout;
    let rect = this.node.getBoundingClientRect();
    if (layout.orientation === Orientation.Horizontal) {
      pos = event.clientX - rect.left - this._pressData.delta;
    } else {
      pos = event.clientY - rect.top - this._pressData.delta;
    }

    // Move the handle as close to the desired position as possible.
    layout.moveHandle(this._pressData.index, pos);
  }

  /**
   * Handle the `'mouseup'` event for the split panel.
   */
  private _evtMouseUp(event: MouseEvent): void {
    // Do nothing if the left mouse button is not released.
    if (event.button !== 0) {
      return;
    }

    // Stop the event when releasing a handle.
    event.preventDefault();
    event.stopPropagation();

    // Finalize the mouse release.
    this._releaseMouse();
  }

  /**
   * Release the mouse grab for the split panel.
   */
  private _releaseMouse(): void {
    // Bail early if no drag is in progress.
    if (!this._pressData) {
      return;
    }

    // Clear the override cursor.
    this._pressData.override.dispose();
    this._pressData = null;

    // Remove the extra document listeners.
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('keydown', this, true);
    document.removeEventListener('keyup', this, true);
    document.removeEventListener('keypress', this, true);
    document.removeEventListener('contextmenu', this, true);
  }

  private _pressData: SplitPanelPrivate.IPressData = null;
}


/**
 * The namespace for the `SplitPanel` class statics.
 */
export
namespace SplitPanel {
  /**
   * A convenience alias of the `Horizontal` [[Orientation]].
   */
  export
  const Horizontal = Orientation.Horizontal;

  /**
   * A convenience alias of the `Vertical` [[Orientation]].
   */
  export
  const Vertical = Orientation.Vertical;

  /**
   * Get the split panel stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The split panel stretch factor for the widget.
   */
  export
  function getStretch(widget: Widget): number {
    return SplitLayout.getStretch(widget);
  }

  /**
   * Set the split panel stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @param value - The value for the stretch factor.
   */
  export
  function setStretch(widget: Widget, value: number): void {
    SplitLayout.setStretch(widget, value);
  }
}


/**
 * The namespace for the `SplitPanel` class private data.
 */
namespace SplitPanelPrivate {
  /**
   * An object which holds mouse press data.
   */
  export
  interface IPressData {
    /**
     * The index of the pressed handle.
     */
    index: number;

    /**
     * The offset of the press in handle coordinates.
     */
    delta: number;

    /**
     * The disposable which will clear the override cursor.
     */
    override: IDisposable;
  }

  /**
   * An object which holds a split handle and index.
   */
  export
  interface IHandlePair {
    /**
     * The index of the handle.
     */
    index: number;

    /**
     * The split handle at the index.
     */
    handle: HTMLElement;
  }

  /**
   * Find the split handle which contains the given target element.
   */
  export
  function findHandle(layout: SplitLayout, target: HTMLElement): IHandlePair {
    for (let i = 0, n = layout.childCount(); i < n; ++i) {
      let handle = layout.handleAt(i);
      if (handle.contains(target)) {
        return { index: i, handle };
      }
    }
    return { index: -1, handle: null };
  }
}
