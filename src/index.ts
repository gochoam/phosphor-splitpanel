/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import * as arrays
  from 'phosphor-arrays';

import {
  BoxSizer, boxCalc
} from 'phosphor-boxengine';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IBoxSizing, boxSizing, overrideCursor, sizeLimits
} from 'phosphor-domutil';

import {
  Message, sendMessage
} from 'phosphor-messaging';

import {
  NodeWrapper
} from 'phosphor-nodewrapper';

import {
  Property
} from 'phosphor-properties';

import {
  ChildMessage, Panel, PanelLayout, ResizeMessage, Widget
} from 'phosphor-widget';

import './index.css';


// TODO - need better solution for storing these class names

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
 * The class name added to horizontal split panels and handles.
 */
const HORIZONTAL_CLASS = 'p-mod-horizontal';

/**
 * The class name added to vertical split panels and handles.
 */
const VERTICAL_CLASS = 'p-mod-vertical';

/**
 * The class name added to hidden split handles.
 */
const HIDDEN_CLASS = 'p-mod-hidden';


/**
 * The orientation of a split layout.
 */
export
enum Orientation {
  /**
   * Left-to-right horizontal orientation.
   */
  Horizontal,

  /**
   * Top-to-bottom vertical orientation.
   */
  Vertical,
}


/**
 * An object which is used as a split handle in a split layout.
 */
export
interface ISplitHandle extends NodeWrapper {
  /**
   * Whether the handle is hidden.
   *
   * #### Notes
   * This is a read-write property.
   */
  hidden: boolean;

  /**
   * The orientation of the handle.
   *
   * #### Notes
   * This is a read-write property.
   */
  orientation: Orientation;
}


/**
 * A concrete implementation of ISplitHandle.
 *
 * #### Notes
 * This is the default split handle type for a [[SplitPanel]].
 */
export
class SplitHandle extends NodeWrapper implements ISplitHandle {
  /**
   * Construct a new split handle.
   */
  constructor() {
    super();
    this.addClass(HORIZONTAL_CLASS);
  }

  /**
   * Get whether the split handle is hidden.
   */
  get hidden(): boolean {
    return this.hasClass(HIDDEN_CLASS);
  }

  /**
   * Set whether the split handle is hidden.
   */
  set hidden(value: boolean) {
    this.toggleClass(HIDDEN_CLASS, value);
  }

  /**
   * Get the orientation of the split handle.
   */
  get orientation(): Orientation {
    let horizontal = this.hasClass(HORIZONTAL_CLASS);
    return horizontal ? Orientation.Horizontal : Orientation.Vertical;
  }

  /**
   * Set the orientation of the split handle.
   */
  set orientation(value: Orientation) {
    this.toggleClass(HORIZONTAL_CLASS, value === Orientation.Horizontal);
    this.toggleClass(VERTICAL_CLASS, value === Orientation.Vertical);
  }
}


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
  static createHandle(): ISplitHandle {
    let handle = new SplitHandle();
    handle.addClass(HANDLE_CLASS);
    return handle;
  }

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
   * Get the split handle for the widget at the given index.
   *
   * @param index - The index of the widget of interest.
   *
   * @returns The split handle for the widget, or `undefined`.
   */
  handleAt(index: number): ISplitHandle {
    return (this.layout as SplitLayout).handleAt(index);
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
  }

  /**
   * A message handler invoked on a `'child-added'` message.
   */
  protected onChildAdded(msg: ChildMessage): void {
    msg.child.addClass(CHILD_CLASS);
  }

  /**
   * A message handler invoked on a `'child-removed'` message.
   */
  protected onChildRemoved(msg: ChildMessage): void {
    msg.child.removeClass(CHILD_CLASS);
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
    let { index, handle } = this._findHandle(event.target as HTMLElement);
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
    let rect = handle.node.getBoundingClientRect();
    if (this.orientation === Orientation.Horizontal) {
      delta = event.clientX - rect.left;
    } else {
      delta = event.clientY - rect.top;
    }

    // Override the cursor and store the press data.
    let style = window.getComputedStyle(handle.node);
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
    let data = this._pressData;
    let layout = this.layout as SplitLayout;
    let rect = this.node.getBoundingClientRect();
    if (layout.orientation === Orientation.Horizontal) {
      pos = event.clientX - data.delta - rect.left;
    } else {
      pos = event.clientY - data.delta - rect.top;
    }

    // Move the handle as close to the desired position as possible.
    layout.moveHandle(data.index, pos);
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
   * Find the split handle which contains the given target.
   */
  private _findHandle(target: HTMLElement): { index: number, handle: ISplitHandle } {
    let layout = this.layout as SplitLayout;
    for (let i = 0, n = layout.childCount(); i < n; ++i) {
      let handle = layout.handleAt(i);
      if (handle.contains(target)) {
        return { index: i, handle };
      }
    }
    return { index: -1, handle: null };
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

  private _pressData: IPressData = null;
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
 * A factory object which creates handles for a split layout.
 */
export
interface IHandleFactory {
  /**
   * Create a new split handle for use with a split layout.
   */
  createHandle(): ISplitHandle;
}


/**
 * A layout which arranges its children into resizable sections.
 */
export
class SplitLayout extends PanelLayout {
  /**
   * Construct a new split layout.
   *
   * @param factory - The factory for creating split handles.
   */
  constructor(factory: IHandleFactory) {
    super();
    this._factory = factory;
  }

  /**
   * Get the layout orientation for the split layout.
   */
  get orientation(): Orientation {
    return SplitLayoutPrivate.orientationProperty.get(this);
  }

  /**
   * Set the layout orientation for the split layout.
   */
  set orientation(value: Orientation) {
    SplitLayoutPrivate.orientationProperty.set(this, value);
  }

  /**
   * Get the inter-element spacing for the split layout.
   */
  get spacing(): number {
    return SplitLayoutPrivate.spacingProperty.get(this);
  }

  /**
   * Set the inter-element spacing for the split layout.
   */
  set spacing(value: number) {
    SplitLayoutPrivate.spacingProperty.set(this, value);
  }

  /**
   * Get the normalized sizes of the widgets in the layout.
   *
   * @returns The normalized sizes of the widgets in the layout.
   */
  sizes(): number[] {
    return SplitLayoutPrivate.normalize(this._sizers.map(s => s.size));
  }

  /**
   * Set the relative sizes for the child widgets in the layout.
   *
   * @param sizes - The relative sizes for the children in the layout.
   *   These values will be normalized to the available layout space.
   *
   * #### Notes
   * Extra values are ignored, too few will yield an undefined layout.
   */
  setSizes(sizes: number[]): void {
    let normed = SplitLayoutPrivate.normalize(sizes);
    for (let i = 0, n = this._sizers.length; i < n; ++i) {
      let hint = Math.max(0, normed[i] || 0);
      let sizer = this._sizers[i];
      sizer.sizeHint = hint;
      sizer.size = hint;
    }
    this._pendingSizes = true;
    if (this.parent) this.parent.update();
  }

  /**
   * Get the handle for the widget at the given index.
   *
   * @param index - The index of the handle of interest.
   *
   * @returns The handle for the given index, or `undefined`.
   */
  handleAt(index: number): HTMLElement {
    return SplitLayoutPrivate.handlesProperty.get(this)[index];
  }

  /**
   * Move a split handle to the specified offset position.
   *
   * @param index - The index of the handle of the interest.
   *
   * @param position - The desired offset position of the handle. This
   *   is the absolute position relative to the origin of the parent.
   *
   * #### Notes
   * This will move the specified handle as close as possible to the
   * desired position, adjusting sibling children if required. It will
   * not violate the size constraints of any child.
   */
  moveHandle(index: number, position: number): void {
    // Bail if the index is invalid or the handle is hidden.
    let handle = this.handleAt(index);
    if (!handle || handle.hidden) {
      return;
    }

    // Compute the delta movement for the handle.
    let delta: number;
    if (this.orientation === Orientation.Horizontal) {
      delta = position - handle.offsetLeft;
    } else {
      delta = position - handle.offsetTop;
    }

    // Bail if there is no handle movement.
    if (delta === 0) {
      return;
    }

    // Prevent item resizing unless needed.
    let sizers = SplitLayoutPrivate.sizersProperty.get(this);
    for (let sizer of sizers) {
      if (sizer.size > 0) sizer.sizeHint = sizer.size;
    }

    // Adjust the sizers to reflect the movement.
    if (delta > 0) {
      SplitLayoutPrivate.growSizer(sizers, index, delta);
    } else {
      SplitLayoutPrivate.shrinkSizer(sizers, index, -delta);
    }

    // Update the layout of the child widgets.
    if (this.parent) this.parent.update();
  }

  /**
   * Initialize the children of the layout.
   *
   * #### Notes
   * This method is called automatically when the layout is installed
   * on its parent widget.
   */
  protected initialize(): void {
    SplitLayoutPrivate.initialize(this);
    super.initialize();
  }

  /**
   * Attach a child widget to the parent's DOM node.
   *
   * @param index - The current index of the child in the layout.
   *
   * @param child - The child widget to attach to the parent.
   *
   * #### Notes
   * This is a reimplementation of the superclass method.
   */
  protected attachChild(index: number, child: Widget): void {
    let sizers = SplitLayoutPrivate.sizersProperty.get(this);
    let handles = SplitLayoutPrivate.handlesProperty.get(this);
    let average = SplitLayoutPrivate.averageSize(sizers);
    let sizer = SplitLayoutPrivate.createSizer(average);
    let handle = SplitLayoutPrivate.createHandle(this);
    arrays.insert(sizers, index, sizer);
    arrays.insert(handles, index, handle);
    SplitLayoutPrivate.prepareGeometry(child);
    this.parent.node.appendChild(child.node);
    this.parent.node.appendChild(handle);
    if (this.parent.isAttached) sendMessage(child, Widget.MsgAfterAttach);
    this.parent.fit();
  }

  /**
   * Move a child widget in the parent's DOM node.
   *
   * @param fromIndex - The previous index of the child in the layout.
   *
   * @param toIndex - The current index of the child in the layout.
   *
   * @param child - The child widget to move in the parent.
   *
   * #### Notes
   * This is a reimplementation of the superclass method.
   */
  protected moveChild(fromIndex: number, toIndex: number, child: Widget): void {
    let sizers = SplitLayoutPrivate.sizersProperty.get(this);
    let handles = SplitLayoutPrivate.handlesProperty.get(this);
    arrays.move(sizers, fromIndex, toIndex);
    arrays.move(handles, fromIndex, toIndex);
    this.parent.fit();  // fit instead of update to show/hide handles
  }

  /**
   * Detach a child widget from the parent's DOM node.
   *
   * @param index - The previous index of the child in the layout.
   *
   * @param child - The child widget to detach from the parent.
   *
   * #### Notes
   * This is a reimplementation of the superclass method.
   */
  protected detachChild(index: number, child: Widget): void {
    let sizers = SplitLayoutPrivate.sizersProperty.get(this);
    let handles = SplitLayoutPrivate.handlesProperty.get(this);
    let sizer = arrays.removeAt(sizers, index);
    let handle = arrays.removeAt(handles, index);
    if (this.parent.isAttached) sendMessage(child, Widget.MsgBeforeDetach);
    this.parent.node.removeChild(child.node);
    this.parent.node.removeChild(handle);
    SplitLayoutPrivate.resetGeometry(child);
    this.parent.fit();
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.parent.update();
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.parent.fit();
  }

  /**
   * A message handler invoked on a `'child-shown'` message.
   */
  protected onChildShown(msg: ChildMessage): void {
    // IE paints before firing animation frame callbacks when toggling
    // `display: none`. This causes flicker, so IE is fit immediately.
    if (SplitLayoutPrivate.IsIE) {
      sendMessage(this.parent, Widget.MsgFitRequest);
    } else {
      this.parent.fit();
    }
  }

  /**
   * A message handler invoked on a `'child-hidden'` message.
   */
  protected onChildHidden(msg: ChildMessage): void {
    // IE paints before firing animation frame callbacks when toggling
    // `display: none`. This causes flicker, so IE is fit immediately.
    if (SplitLayoutPrivate.IsIE) {
      sendMessage(this.parent, Widget.MsgFitRequest);
    } else {
      this.parent.fit();
    }
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: ResizeMessage): void {
    if (this.parent.isVisible) {
      SplitLayoutPrivate.update(this, msg.width, msg.height);
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.parent.isVisible) {
      SplitLayoutPrivate.update(this, -1, -1);
    }
  }

  /**
   * A message handler invoked on a `'fit-request'` message.
   */
  protected onFitRequest(msg: Message): void {
    if (this.parent.isAttached) {
      SplitLayoutPrivate.fit(this);
    }
  }

  private _pendingSizes = false;
  private _factory: IHandleFactory;
  private _sizers: BoxSizer[] = [];
  private _handles: SplitHandle[] = [];
}


/**
 * The namespace for the `SplitLayout` class statics.
 */
export
namespace SplitLayout {
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
   * Get the split layout stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The split layout stretch factor for the widget.
   */
  export
  function getStretch(widget: Widget): number {
    return SplitLayoutPrivate.stretchProperty.get(widget);
  }

  /**
   * Set the split layout stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @param value - The value for the stretch factor.
   */
  export
  function setStretch(widget: Widget, value: number): void {
    SplitLayoutPrivate.stretchProperty.set(widget, value);
  }
}


/**
 * An object which holds mouse press data.
 */
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
 * The namespace for the `SplitLayout` class private data.
 */
namespace SplitLayoutPrivate {
  /**
   * A flag indicating whether the browser is IE.
   */
  export
  const IsIE = /Trident/.test(navigator.userAgent);

  /**
   * The property descriptor for the split layout orientation.
   */
  export
  const orientationProperty = new Property<SplitLayout, Orientation>({
    name: 'orientation',
    value: Orientation.Horizontal,
    changed: onOrientationChanged,
  });

  /**
   * The property descriptor for the split layout spacing.
   */
  export
  const spacingProperty = new Property<SplitLayout, number>({
    name: 'spacing',
    value: 3,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: onSpacingChanged,
  });

  /**
   * The property descriptor for a widget stretch factor.
   */
  export
  const stretchProperty = new Property<Widget, number>({
    name: 'stretch',
    value: 0,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: onChildPropertyChanged,
  });

  /**
   * Create a new box sizer with the given size hint.
   */
  export
  function createSizer(size: number): BoxSizer {
    let sizer = new BoxSizer();
    sizer.sizeHint = size | 0;
    return sizer;
  }

  /**
   * Create a new split handle using the given handle
   */
  export
  function createHandle(factory: IHandleFactory): ISplitHandle {
    let handle = factory.createHandle();
    handle.node.style.position = 'absolute';
    return handle;
  }

  /**
   * Compute the average size of the given box sizers.
   */
  export
  function averageSize(sizers: BoxSizer[]): number {
    if (sizers.length === 0) return 0;
    return sizers.reduce((v, s) => v + s.size, 0) / sizers.length;
  }

  /**
   * Normalize an array of positive values.
   */
  export
  function normalize(values: number[]): number[] {
    let n = values.length;
    if (n === 0) {
      return [];
    }
    let sum = 0;
    for (let i = 0; i < n; ++i) {
      sum += values[i];
    }
    let result = new Array<number>(n);
    if (sum === 0) {
      for (let i = 0; i < n; ++i) {
        result[i] = 1 / n;
      }
    } else {
      for (let i = 0; i < n; ++i) {
        result[i] = values[i] / sum;
      }
    }
    return result;
  }

  /**
   * Initialize the private layout state.
   *
   * #### Notes
   * This should be called during layout initialization.
   */
  export
  function initialize(layout: SplitLayout): void {
    updateParentOrientation(layout);
  }

  /**
   * Prepare the layout geometry for the given child widget.
   */
  export
  function prepareGeometry(widget: Widget): void {
    widget.node.style.position = 'absolute';
  }

  /**
   * Reset the layout geometry for the given child widget.
   */
  export
  function resetGeometry(widget: Widget): void {
    let rect = rectProperty.get(widget);
    let style = widget.node.style;
    rect.top = NaN;
    rect.left = NaN;
    rect.width = NaN;
    rect.height = NaN;
    style.position = '';
    style.top = '';
    style.left = '';
    style.width = '';
    style.height = '';
  }

  /**
   * Fit the layout to the total size required by the child widgets.
   */
  export
  function fit(layout: SplitLayout): void {
    // Bail early if there is no parent.
    let parent = layout.parent;
    if (!parent) {
      return;
    }

    // Update the handles and track the visible widget count.
    let visibleCount = 0;
    let orient = layout.orientation;
    let handles = handlesProperty.get(layout);
    let lastVisibleHandle: HTMLElement = null;
    for (let i = 0, n = layout.childCount(); i < n; ++i) {
      let widget = layout.childAt(i);
      let handle = handles[i];
      toggleClass(handle, HIDDEN_CLASS, widget.isHidden);
      toggleClass(handle, HORIZONTAL_CLASS, orient === Orientation.Horizontal);
      toggleClass(handle, VERTICAL_CLASS, orient === Orientation.Vertical);
      if (!widget.isHidden) {
        lastVisibleHandle = handle;
        visibleCount++;
      }
    }

    // Hide the last visible handle and update the fixed spacing.
    if (lastVisibleHandle) toggleClass(lastVisibleHandle, HIDDEN_CLASS, true);
    let fixedSpace = layout.spacing * Math.max(0, visibleCount - 1);
    fixedSpaceProperty.set(layout, fixedSpace);

    // Update the sizers and compute the new size limits.
    let minW = 0;
    let minH = 0;
    let maxW = Infinity;
    let maxH = Infinity;
    let sizers = sizersProperty.get(layout);
    if (orient === Orientation.Horizontal) {
      minW = fixedSpace;
      maxW = visibleCount > 0 ? minW : maxW;
      for (let i = 0, n = layout.childCount(); i < n; ++i) {
        let widget = layout.childAt(i);
        let sizer = sizers[i];
        if (sizer.size > 0) {
          sizer.sizeHint = sizer.size;
        }
        if (widget.isHidden) {
          sizer.minSize = 0;
          sizer.maxSize = 0;
          continue;
        }
        let limits = sizeLimits(widget.node);
        sizer.stretch = stretchProperty.get(widget);
        sizer.minSize = limits.minWidth;
        sizer.maxSize = limits.maxWidth;
        minW += limits.minWidth;
        maxW += limits.maxWidth;
        minH = Math.max(minH, limits.minHeight);
        maxH = Math.min(maxH, limits.maxHeight);
      }
    } else {
      minH = fixedSpace;
      maxH = visibleCount > 0 ? minH : maxH;
      for (let i = 0, n = layout.childCount(); i < n; ++i) {
        let widget = layout.childAt(i);
        let sizer = sizers[i];
        if (sizer.size > 0) {
          sizer.sizeHint = sizer.size;
        }
        if (widget.isHidden) {
          sizer.minSize = 0;
          sizer.maxSize = 0;
          continue;
        }
        let limits = sizeLimits(widget.node);
        sizer.stretch = stretchProperty.get(widget);
        sizer.minSize = limits.minHeight;
        sizer.maxSize = limits.maxHeight;
        minH += limits.minHeight;
        maxH += limits.maxHeight;
        minW = Math.max(minW, limits.minWidth);
        maxW = Math.min(maxW, limits.maxWidth);
      }
    }

    // Update the box sizing and add it to the size constraints.
    let box = boxSizing(parent.node);
    boxSizingProperty.set(parent, box);
    minW += box.horizontalSum;
    minH += box.verticalSum;
    maxW += box.horizontalSum;
    maxH += box.verticalSum;

    // Update the panel's size constraints.
    let style = parent.node.style;
    style.minWidth = minW + 'px';
    style.minHeight = minH + 'px';
    style.maxWidth = maxW === Infinity ? 'none' : maxW + 'px';
    style.maxHeight = maxH === Infinity ? 'none' : maxH + 'px';

    // Notify the ancestor that it should fit immediately.
    if (parent.parent) sendMessage(parent.parent, Widget.MsgFitRequest);

    // Notify the parent that it should update immediately.
    sendMessage(parent, Widget.MsgUpdateRequest);
  }

  /**
   * Layout the children using the given offset width and height.
   *
   * If the dimensions are unknown, they should be specified as `-1`.
   */
  export
  function update(layout: SplitLayout, offsetWidth: number, offsetHeight: number): void {
    // Bail early if their are no children to layout.
    if (layout.childCount() === 0) {
      return;
    }

    // Bail early if there is no parent.
    let parent = layout.parent;
    if (!parent) {
      return;
    }

    // Measure the parent if the offset dimensions are unknown.
    if (offsetWidth < 0) {
      offsetWidth = parent.node.offsetWidth;
    }
    if (offsetHeight < 0) {
      offsetHeight = parent.node.offsetHeight;
    }

    // Lookup the layout data.
    let spacing = layout.spacing;
    let orient = layout.orientation;
    let box = boxSizingProperty.get(parent);
    let sizers = sizersProperty.get(layout);
    let handles = handlesProperty.get(layout);
    let fixedSpace = fixedSpaceProperty.get(layout);

    // Compute the actual layout bounds adjusted for border and padding.
    let top = box.paddingTop;
    let left = box.paddingLeft;
    let width = offsetWidth - box.horizontalSum;
    let height = offsetHeight - box.verticalSum;

    // Compute the adjusted main layout space.
    let mainSpace: number;
    if (orient === Orientation.Horizontal) {
      mainSpace = Math.max(0, width - fixedSpace);
    } else {
      mainSpace = Math.max(0, height - fixedSpace);
    }

    // Update the sizer hints if there is a pending set sizes.
    if (pendingSizesProperty.get(layout)) {
      for (let i = 0, n = sizers.length; i < n; ++i) {
        sizers[i].sizeHint *= mainSpace;
      }
      pendingSizesProperty.set(layout, false);
    }

    // Distribute the available layout space.
    boxCalc(sizers, mainSpace);

    // Layout the children.
    if (orient === Orientation.Horizontal) {
      for (let i = 0, n = layout.childCount(); i < n; ++i) {
        let widget = layout.childAt(i);
        if (widget.isHidden) {
          continue;
        }
        let size = sizers[i].size;
        let handle = handles[i];
        setGeometry(widget, left, top, size, height);
        setHandleGeometry(handle, left + size, top, spacing, height);
        left += size + spacing;
      }
    } else {
      for (let i = 0, n = layout.childCount(); i < n; ++i) {
        let widget = layout.childAt(i);
        if (widget.isHidden) {
          continue;
        }
        let size = sizers[i].size;
        let handle = handles[i];
        setGeometry(widget, left, top, width, size);
        setHandleGeometry(handle, left, top + size, width, spacing);
        top += size + spacing;
      }
    }
  }

  /**
   * Grow a sizer to the right by a positive delta and adjust neighbors.
   */
  export
  function growSizer(sizers: BoxSizer[], index: number, delta: number): void {
    let growLimit = 0;
    for (let i = 0; i <= index; ++i) {
      let sizer = sizers[i];
      growLimit += sizer.maxSize - sizer.size;
    }
    let shrinkLimit = 0;
    for (let i = index + 1, n = sizers.length; i < n; ++i) {
      let sizer = sizers[i];
      shrinkLimit += sizer.size - sizer.minSize;
    }
    delta = Math.min(delta, growLimit, shrinkLimit);
    let grow = delta;
    for (let i = index; i >= 0 && grow > 0; --i) {
      let sizer = sizers[i];
      let limit = sizer.maxSize - sizer.size;
      if (limit >= grow) {
        sizer.sizeHint = sizer.size + grow;
        grow = 0;
      } else {
        sizer.sizeHint = sizer.size + limit;
        grow -= limit;
      }
    }
    let shrink = delta;
    for (let i = index + 1, n = sizers.length; i < n && shrink > 0; ++i) {
      let sizer = sizers[i];
      let limit = sizer.size - sizer.minSize;
      if (limit >= shrink) {
        sizer.sizeHint = sizer.size - shrink;
        shrink = 0;
      } else {
        sizer.sizeHint = sizer.size - limit;
        shrink -= limit;
      }
    }
  }

  /**
   * Shrink a sizer to the left by a positive delta and adjust neighbors.
   */
  export
  function shrinkSizer(sizers: BoxSizer[], index: number, delta: number): void {
    let growLimit = 0;
    for (let i = index + 1, n = sizers.length; i < n; ++i) {
      let sizer = sizers[i];
      growLimit += sizer.maxSize - sizer.size;
    }
    let shrinkLimit = 0;
    for (let i = 0; i <= index; ++i) {
      let sizer = sizers[i];
      shrinkLimit += sizer.size - sizer.minSize;
    }
    delta = Math.min(delta, growLimit, shrinkLimit);
    let grow = delta;
    for (let i = index + 1, n = sizers.length; i < n && grow > 0; ++i) {
      let sizer = sizers[i];
      let limit = sizer.maxSize - sizer.size;
      if (limit >= grow) {
        sizer.sizeHint = sizer.size + grow;
        grow = 0;
      } else {
        sizer.sizeHint = sizer.size + limit;
        grow -= limit;
      }
    }
    let shrink = delta;
    for (let i = index; i >= 0 && shrink > 0; --i) {
      let sizer = sizers[i];
      let limit = sizer.size - sizer.minSize;
      if (limit >= shrink) {
        sizer.sizeHint = sizer.size - shrink;
        shrink = 0;
      } else {
        sizer.sizeHint = sizer.size - limit;
        shrink -= limit;
      }
    }
  }

  /**
   * An object which represents an offset rect.
   */
  interface IRect {
    /**
     * The offset top edge, in pixels.
     */
    top: number;

    /**
     * The offset left edge, in pixels.
     */
    left: number;

    /**
     * The offset width, in pixels.
     */
    width: number;

    /**
     * The offset height, in pixels.
     */
    height: number;
  }

  /**
   * A property descriptor for a widget offset rect.
   */
  var rectProperty = new Property<Widget, IRect>({
    name: 'rect',
    create: () => ({ top: NaN, left: NaN, width: NaN, height: NaN }),
  });

  /**
   * A property descriptor for the box sizing of a widget.
   */
  var boxSizingProperty = new Property<Widget, IBoxSizing>({
    name: 'boxSizing',
    create: owner => boxSizing(owner.node),
  });

  /**
   * A property descriptor for the box layout fixed spacing.
   */
  var fixedSpaceProperty = new Property<SplitLayout, number>({
    name: 'fixedSpace',
    value: 0,
  });

  /**
   * The change handler for the split layout orientation.
   */
  function onOrientationChanged(layout: SplitLayout): void {
    updateParentOrientation(layout);
    if (layout.parent) layout.parent.fit();
  }

  /**
   * The change handler for the split layout spacing.
   */
  function onSpacingChanged(layout: SplitLayout): void {
    if (layout.parent) layout.parent.fit();
  }

  /**
   * The change handler for the attached child properties.
   */
  function onChildPropertyChanged(child: Widget): void {
    let parent = child.parent;
    let layout = parent && parent.layout;
    if (layout instanceof SplitLayout) parent.fit();
  }

  /**
   * Update the CSS orientation class on the layout parent.
   */
  function updateParentOrientation(layout: SplitLayout): void {
    if (!layout.parent) return;
    let parent = layout.parent;
    let orient = layout.orientation;
    parent.toggleClass(HORIZONTAL_CLASS, orient === Orientation.Horizontal);
    parent.toggleClass(VERTICAL_CLASS, orient === Orientation.Vertical);
  }

  /**
   * Set the offset geometry for the given widget.
   *
   * A resize message will be dispatched to the widget if appropriate.
   */
  function setGeometry(widget: Widget, left: number, top: number, width: number, height: number): void {
    let resized = false;
    let style = widget.node.style;
    let rect = rectProperty.get(widget);
    if (rect.top !== top) {
      rect.top = top;
      style.top = top + 'px';
    }
    if (rect.left !== left) {
      rect.left = left;
      style.left = left + 'px';
    }
    if (rect.width !== width) {
      resized = true;
      rect.width = width;
      style.width = width + 'px';
    }
    if (rect.height !== height) {
      resized = true;
      rect.height = height;
      style.height = height + 'px';
    }
    if (resized) {
      sendMessage(widget, new ResizeMessage(width, height));
    }
  }

  /**
   *
   */
  function setHandleGeometry(handle: HTMLElement, left: number, top: number, width: number, height: number): void {
    let style = handle.style;
    style.top = top + 'px';
    style.left = left + 'px';
    style.width = width + 'px';
    style.height = height + 'px';
  }
}
