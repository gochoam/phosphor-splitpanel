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
  Message, postMessage, sendMessage
} from 'phosphor-messaging';

import {
  NodeWrapper
} from 'phosphor-nodewrapper';

import {
  Property
} from 'phosphor-properties';

import {
  ChildIndexMessage, ChildMessage, Panel, ResizeMessage, Widget
} from 'phosphor-widget';

import './index.css';


/**
 * The class name added to SplitPanel instances.
 */
const SPLIT_PANEL_CLASS = 'p-SplitPanel';

/**
 * The class name added to SplitHandle instances.
 */
const SPLIT_HANDLE_CLASS = 'p-SplitHandle';

/**
 * The class name added to a split handle overlay.
 */
const OVERLAY_CLASS = 'p-SplitHandle-overlay';

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
 * The layout orientation of a split panel.
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
 * A panel which arranges its children into resizable sections.
 */
export
class SplitPanel extends Panel {
  /**
   * A convenience alias of the `Horizontal` [[Orientation]].
   */
  static Horizontal = Orientation.Horizontal;

  /**
   * A convenience alias of the `Vertical` [[Orientation]].
   */
  static Vertical = Orientation.Vertical;

  /**
   * The property descriptor for the split panel orientation.
   *
   * The controls whether the child widgets are arranged lef-to-right
   * (`Horizontal` the default) or top-to-bottom (`Vertical`).
   *
   * **See also:** [[orientation]]
   */
  static orientationProperty = new Property<SplitPanel, Orientation>({
    name: 'orientation',
    value: Orientation.Horizontal,
    changed: (owner, old, value) => owner._onOrientationChanged(old, value),
  });

  /**
   * The property descriptor for the split panel spacing.
   *
   * The controls the fixed spacing between the child widgets, in
   * pixels. The default value is `3`.
   *
   * **See also:** [[spacing]]
   */
  static spacingProperty = new Property<SplitPanel, number>({
    name: 'spacing',
    value: 3,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: owner => postMessage(owner, Panel.MsgLayoutRequest),
  });

  /**
   * The property descriptor for a widget stretch factor.
   *
   * This is an attached property which controls how much a child widget
   * stretches or shrinks relative to its siblings when the split panel
   * is resized. The default value is `0`.
   *
   * **See also:** [[getStretch]], [[setStretch]]
   */
  static stretchProperty = new Property<Widget, number>({
    name: 'stretch',
    value: 0,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: onChildPropertyChanged,
  });

  /**
   * Get the split panel stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @returns The split panel stretch factor for the widget.
   *
   * #### Notes
   * This is a pure delegate to the [[stretchProperty]].
   */
  static getStretch(widget: Widget): number {
    return SplitPanel.stretchProperty.get(widget);
  }

  /**
   * Set the split panel stretch factor for the given widget.
   *
   * @param widget - The widget of interest.
   *
   * @param value - The value for the stretch factor.
   *
   * #### Notes
   * This is a pure delegate to the [[stretchProperty]].
   */
  static setStretch(widget: Widget, value: number): void {
    SplitPanel.stretchProperty.set(widget, value);
  }

  /**
   * Construct a new split panel.
   */
  constructor() {
    super();
    this.addClass(SPLIT_PANEL_CLASS);
    this.addClass(HORIZONTAL_CLASS);
  }

  /**
   * Dispose of the resources held by the panel.
   */
  dispose(): void {
    this._releaseMouse();
    this._sizers.length = 0;
    super.dispose();
  }

  /**
   * Get the orientation of the split panel.
   *
   * #### Notes
   * This is a pure delegate to the [[orientationProperty]].
   */
  get orientation(): Orientation {
    return SplitPanel.orientationProperty.get(this);
  }

  /**
   * Set the orientation of the split panel.
   *
   * #### Notes
   * This is a pure delegate to the [[orientationProperty]].
   */
  set orientation(value: Orientation) {
    SplitPanel.orientationProperty.set(this, value);
  }

  /**
   * Get the inter-element spacing for the split panel.
   *
   * #### Notes
   * This is a pure delegate to the [[spacingProperty]].
   */
  get spacing(): number {
    return SplitPanel.spacingProperty.get(this);
  }

  /**
   * Set the inter-element spacing for the split panel.
   *
   * #### Notes
   * This is a pure delegate to the [[spacingProperty]].
   */
  set spacing(value: number) {
    SplitPanel.spacingProperty.set(this, value);
  }

  /**
   * Get the normalized sizes of the widgets in the panel.
   *
   * @returns The normalized sizes of the widgets in the panel.
   */
  sizes(): number[] {
    return normalize(this._sizers.map(sizer => sizer.size));
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
    let normed = normalize(sizes);
    for (let i = 0, n = this._sizers.length; i < n; ++i) {
      let hint = Math.max(0, normed[i] || 0);
      let sizer = this._sizers[i];
      sizer.sizeHint = hint;
      sizer.size = hint;
    }
    this._pendingSizes = true;
    postMessage(this, Widget.MsgUpdateRequest);
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
    case 'keydown':
      this._evtKeyDown(event as KeyboardEvent);
      break;
    case 'mousedown':
      this._evtMouseDown(event as MouseEvent);
      break;
    case 'mousemove':
      this._evtMouseMove(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseUp(event as MouseEvent);
      break;
    case 'keyup':
    case 'keypress':
    case 'contextmenu':
      // Stop all input events during resize.
      event.preventDefault();
      event.stopPropagation();
      break;
    }
  }

  /**
   * A message handler invoked on a `'child-added'` message.
   */
  protected onChildAdded(msg: ChildIndexMessage): void {
    let sizer = createSizer(averageSize(this._sizers));
    arrays.insert(this._sizers, msg.currentIndex, sizer);
    this.node.appendChild(msg.child.node);
    this.node.appendChild(getHandle(msg.child).node);
    if (this.isAttached) sendMessage(msg.child, Widget.MsgAfterAttach);
    postMessage(this, Panel.MsgLayoutRequest);
  }

  /**
   * A message handler invoked on a `'child-moved'` message.
   */
  protected onChildMoved(msg: ChildIndexMessage): void {
    arrays.move(this._sizers, msg.previousIndex, msg.currentIndex);
    postMessage(this, Panel.MsgLayoutRequest);
  }

  /**
   * A message handler invoked on a `'child-removed'` message.
   */
  protected onChildRemoved(msg: ChildIndexMessage): void {
    arrays.removeAt(this._sizers, msg.previousIndex);
    if (this.isAttached) sendMessage(msg.child, Widget.MsgBeforeDetach);
    this.node.removeChild(msg.child.node);
    this.node.removeChild(getHandle(msg.child).node);
    postMessage(this, Panel.MsgLayoutRequest);
    resetGeometry(msg.child);
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    sendMessage(this, Widget.MsgUpdateRequest);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('mousedown', this);
    postMessage(this, Panel.MsgLayoutRequest);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('mousedown', this);
  }

  /**
   * A message handler invoked on a `'child-shown'` message.
   */
  protected onChildShown(msg: ChildMessage): void {
    postMessage(this, Panel.MsgLayoutRequest);
  }

  /**
   * A message handler invoked on a `'child-hidden'` message.
   */
  protected onChildHidden(msg: ChildMessage): void {
    postMessage(this, Panel.MsgLayoutRequest);
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: ResizeMessage): void {
    if (this.isVisible) {
      let width = msg.width < 0 ? this.node.offsetWidth : msg.width;
      let height = msg.height < 0 ? this.node.offsetHeight : msg.height;
      this._layoutChildren(width, height);
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.isVisible) {
      this._layoutChildren(this.node.offsetWidth, this.node.offsetHeight);
    }
  }

  /**
   * A message handler invoked on a `'layout-request'` message.
   */
  protected onLayoutRequest(msg: Message): void {
    if (this.isAttached) {
      this._setupGeometry();
    }
  }

  /**
   * Update the size constraints of the panel.
   */
  private _setupGeometry(): void {
    // Update the handles and track the visible widget count.
    let visibleCount = 0;
    let orientation = this.orientation;
    let lastVisibleHandle: SplitHandle = null;
    for (let i = 0, n = this.childCount(); i < n; ++i) {
      let widget = this.childAt(i);
      let handle = getHandle(widget);
      handle.hidden = widget.hidden;
      handle.orientation = orientation;
      if (!handle.hidden) {
        lastVisibleHandle = handle;
        visibleCount++;
      }
    }

    // Hide the last visible handle and update the fixed space.
    if (lastVisibleHandle) lastVisibleHandle.hidden = true;
    this._fixedSpace = this.spacing * Math.max(0, visibleCount - 1);

    // Compute new size constraints for the split panel.
    let minW = 0;
    let minH = 0;
    let maxW = Infinity;
    let maxH = Infinity;
    if (orientation === Orientation.Horizontal) {
      minW = this._fixedSpace;
      maxW = visibleCount > 0 ? minW : maxW;
      for (let i = 0, n = this.childCount(); i < n; ++i) {
        let widget = this.childAt(i);
        let sizer = this._sizers[i];
        if (sizer.size > 0) {
          sizer.sizeHint = sizer.size;
        }
        if (widget.hidden) {
          sizer.minSize = 0;
          sizer.maxSize = 0;
          continue;
        }
        let limits = sizeLimits(widget.node);
        sizer.stretch = SplitPanel.getStretch(widget);
        sizer.minSize = limits.minWidth;
        sizer.maxSize = limits.maxWidth;
        minW += limits.minWidth;
        maxW += limits.maxWidth;
        minH = Math.max(minH, limits.minHeight);
        maxH = Math.min(maxH, limits.maxHeight);
      }
    } else {
      minH = this._fixedSpace;
      maxH = visibleCount > 0 ? minH : maxH;
      for (let i = 0, n = this.childCount(); i < n; ++i) {
        let widget = this.childAt(i);
        let sizer = this._sizers[i];
        if (sizer.size > 0) {
          sizer.sizeHint = sizer.size;
        }
        if (widget.hidden) {
          sizer.minSize = 0;
          sizer.maxSize = 0;
          continue;
        }
        let limits = sizeLimits(widget.node);
        sizer.stretch = SplitPanel.getStretch(widget);
        sizer.minSize = limits.minHeight;
        sizer.maxSize = limits.maxHeight;
        minH += limits.minHeight;
        maxH += limits.maxHeight;
        minW = Math.max(minW, limits.minWidth);
        maxW = Math.min(maxW, limits.maxWidth);
      }
    }

    // Update the box sizing and add it to the size constraints.
    this._box = boxSizing(this.node);
    minW += this._box.horizontalSum;
    minH += this._box.verticalSum;
    maxW += this._box.horizontalSum;
    maxH += this._box.verticalSum;

    // Update the panel's size constraints.
    let style = this.node.style;
    style.minWidth = minW + 'px';
    style.minHeight = minH + 'px';
    style.maxWidth = maxW === Infinity ? 'none' : maxW + 'px';
    style.maxHeight = maxH === Infinity ? 'none' : maxH + 'px';

    // Notifiy the parent that it should relayout.
    if (this.parent) sendMessage(this.parent, Panel.MsgLayoutRequest);

    // Update the layout for the child widgets.
    sendMessage(this, Widget.MsgUpdateRequest);
  }

  /**
   * Layout the children using the given offset width and height.
   */
  private _layoutChildren(offsetWidth: number, offsetHeight: number): void {
    // Bail early if their are no children to arrange.
    if (this.childCount() === 0) {
      return;
    }

    // Ensure the box sizing is created.
    let box = this._box || (this._box = boxSizing(this.node));

    // Compute the actual layout bounds adjusted for border and padding.
    let top = box.paddingTop;
    let left = box.paddingLeft;
    let width = offsetWidth - box.horizontalSum;
    let height = offsetHeight - box.verticalSum;

    // Fetch whether the orientation is horizontal.
    let horizontal = this.orientation === Orientation.Horizontal;

    // Update the sizer hints if there is a pending `setSizes`.
    if (this._pendingSizes) {
      let space = horizontal ? width : height;
      let adjusted = Math.max(0, space - this._fixedSpace);
      for (let i = 0, n = this._sizers.length; i < n; ++i) {
        this._sizers[i].sizeHint *= adjusted;
      }
      this._pendingSizes = false;
    }

    // Distribute the layout space and layout the items.
    let spacing = this.spacing;
    if (horizontal) {
      boxCalc(this._sizers, Math.max(0, width - this._fixedSpace));
      for (let i = 0, n = this.childCount(); i < n; ++i) {
        let widget = this.childAt(i);
        if (widget.hidden) {
          continue;
        }
        let size = this._sizers[i].size;
        setGeometry(widget, left, top, size, height);
        getHandle(widget).setGeometry(left + size, top, spacing, height);
        left += size + spacing;
      }
    } else {
      boxCalc(this._sizers, Math.max(0, height - this._fixedSpace));
      for (let i = 0, n = this.childCount(); i < n; ++i) {
        let widget = this.childAt(i);
        if (widget.hidden) {
          continue;
        }
        let size = this._sizers[i].size;
        setGeometry(widget, left, top, width, size);
        getHandle(widget).setGeometry(left, top + size, width, spacing);
        top += size + spacing;
      }
    }
  }

  /**
   * Handle the `'keydown'` event for the split panel.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    // Stop all input events during resize.
    event.preventDefault();
    event.stopPropagation();

    // Release the mouse if `Escape` is pressed.
    if (event.keyCode === 27) this._releaseMouse();
  }

  /**
   * Handle the `'mousedown'` event for the split panel.
   */
  private _evtMouseDown(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }
    let index = findHandleIndex(this, event.target as HTMLElement);
    if (index === -1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    document.addEventListener('keydown', this, true);
    document.addEventListener('keyup', this, true);
    document.addEventListener('keypress', this, true);
    document.addEventListener('contextmenu', this, true);
    document.addEventListener('mouseup', this, true);
    document.addEventListener('mousemove', this, true);
    let delta: number;
    let node = getHandle(this.childAt(index)).node;
    if (this.orientation === Orientation.Horizontal) {
      delta = event.clientX - node.getBoundingClientRect().left;
    } else {
      delta = event.clientY - node.getBoundingClientRect().top;
    }
    let override = overrideCursor(window.getComputedStyle(node).cursor);
    this._pressData = { index: index, delta: delta, override: override };
  }

  /**
   * Handle the `'mousemove'` event for the split panel.
   */
  private _evtMouseMove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    let pos: number;
    let data = this._pressData;
    let rect = this.node.getBoundingClientRect();
    if (this.orientation === Orientation.Horizontal) {
      pos = event.clientX - data.delta - rect.left;
    } else {
      pos = event.clientY - data.delta - rect.top;
    }
    this._moveHandle(data.index, pos);
  }

  /**
   * Handle the `'mouseup'` event for the split panel.
   */
  private _evtMouseUp(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this._releaseMouse();
  }

  /**
   * Release the mouse grab for the split panel.
   */
  private _releaseMouse(): void {
    if (!this._pressData) {
      return;
    }
    this._pressData.override.dispose();
    this._pressData = null;
    document.removeEventListener('keydown', this, true);
    document.removeEventListener('keyup', this, true);
    document.removeEventListener('keypress', this, true);
    document.removeEventListener('contextmenu', this, true);
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('mousemove', this, true);
  }

  /**
   * Move a splitter handle to the specified client position.
   */
  private _moveHandle(index: number, pos: number): void {
    // Bail if the index is invalid.
    let widget = this.childAt(index);
    if (!widget) {
      return;
    }

    // Bail if the handle is hidden.
    let handle = getHandle(widget);
    if (handle.hidden) {
      return;
    }

    // Compute the delta movement for the handle.
    let delta: number;
    if (this.orientation === Orientation.Horizontal) {
      delta = pos - handle.node.offsetLeft;
    } else {
      delta = pos - handle.node.offsetTop;
    }

    // Bail if there is no handle movement.
    if (delta === 0) {
      return;
    }

    // Prevent item resizing unless needed.
    for (let i = 0, n = this._sizers.length; i < n; ++i) {
      let sizer = this._sizers[i];
      if (sizer.size > 0) sizer.sizeHint = sizer.size;
    }

    // Adjust the sizers to reflect the movement.
    if (delta > 0) {
      growSizer(this._sizers, index, delta);
    } else {
      shrinkSizer(this._sizers, index, -delta);
    }

    // Update the layout of the widgets. The message is posted instead
    // of sent because the mouse move event frequency can outpace the
    // browser's ability to layout, leading to choppy handle movement,
    // especially on IE. Posting ensures we don't try to layout faster
    // than the browser can handle.
    postMessage(this, Widget.MsgUpdateRequest);
  }

  /**
   * The change handler for the [[orientationProperty]].
   */
  private _onOrientationChanged(old: Orientation, value: Orientation): void {
    this.toggleClass(HORIZONTAL_CLASS, value === Orientation.Horizontal);
    this.toggleClass(VERTICAL_CLASS, value === Orientation.Vertical);
    postMessage(this, Panel.MsgLayoutRequest);
  }

  private _fixedSpace = 0;
  private _pendingSizes = false;
  private _box: IBoxSizing = null;
  private _sizers: BoxSizer[] = [];
  private _pressData: IPressData = null;
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
 * A class which manages a handle node for a split panel.
 */
class SplitHandle extends NodeWrapper {
  /**
   * Create the DOM node for a split handle.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    node.appendChild(overlay);
    return node;
  }

  /**
   * Construct a new split handle.
   */
  constructor() {
    super();
    this.addClass(SPLIT_HANDLE_CLASS);
    this.addClass(HORIZONTAL_CLASS);
  }

  /**
   * Get whether the handle is hidden.
   */
  get hidden(): boolean {
    return this._hidden;
  }

  /**
   * Set whether the handle is hidden.
   */
  set hidden(hidden: boolean) {
    if (hidden === this._hidden) {
      return;
    }
    this._hidden = hidden;
    this.toggleClass(HIDDEN_CLASS, hidden);
  }

  /**
   * Get the orientation of the handle.
   */
  get orientation(): Orientation {
    return this._orientation;
  }

  /**
   * Set the orientation of the handle.
   */
  set orientation(value: Orientation) {
    if (value === this._orientation) {
      return;
    }
    this._orientation = value;
    this.toggleClass(HORIZONTAL_CLASS, value === Orientation.Horizontal);
    this.toggleClass(VERTICAL_CLASS, value === Orientation.Vertical);
  }

  /**
   * Set the geometry for the handle.
   */
  setGeometry(left: number, top: number, width: number, height: number): void {
    let style = this.node.style;
    style.top = top + 'px';
    style.left = left + 'px';
    style.width = width + 'px';
    style.height = height + 'px';
  }

  private _hidden = false;
  private _orientation = Orientation.Horizontal;
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
 * A private attached property for the split handle for a widget.
 */
const splitHandleProperty = new Property<Widget, SplitHandle>({
  name: 'splitHandle',
  create: owner => new SplitHandle(),
});


/**
 * A private attached property which stores a widget offset rect.
 */
const rectProperty = new Property<Widget, IRect>({
  name: 'rect',
  create: createRect,
});


/**
 * Lookup the split handle for the given widget.
 */
function getHandle(widget: Widget): SplitHandle {
  return splitHandleProperty.get(widget);
}


/**
 * Create a new offset rect filled with NaNs.
 */
function createRect(): IRect {
  return { top: NaN, left: NaN, width: NaN, height: NaN };
}


/**
 * Get the offset rect for a widget.
 */
function getRect(widget: Widget): IRect {
  return rectProperty.get(widget);
}


/**
 * Find the index of the split handle which contains the given target.
 */
function findHandleIndex(panel: SplitPanel, target: HTMLElement): number {
  for (let i = 0, n = panel.childCount(); i < n; ++i) {
    let handle = getHandle(panel.childAt(i));
    if (handle.node.contains(target)) return i;
  }
  return -1;
}


/**
 * Set the offset geometry for the given widget.
 *
 * A resize message will be dispatched to the widget if appropriate.
 */
function setGeometry(widget: Widget, left: number, top: number, width: number, height: number): void {
  let resized = false;
  let rect = getRect(widget);
  let style = widget.node.style;
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
 * Reset the inline geometry and rect cache for the given widget
 */
function resetGeometry(widget: Widget): void {
  let rect = getRect(widget);
  let style = widget.node.style;
  rect.top = NaN;
  rect.left = NaN;
  rect.width = NaN;
  rect.height = NaN;
  style.top = '';
  style.left = '';
  style.width = '';
  style.height = '';
}


/**
 * The change handler for the attached child properties.
 */
function onChildPropertyChanged(child: Widget): void {
  if (child.parent instanceof SplitPanel) {
    postMessage(child.parent, Panel.MsgLayoutRequest);
  }
}


/**
 * Create a new box sizer with the given size hint.
 */
function createSizer(size: number): BoxSizer {
  let sizer = new BoxSizer();
  sizer.sizeHint = size | 0;
  return sizer;
}


/**
 * Compute the average size of the given box sizers.
 */
function averageSize(sizers: BoxSizer[]): number {
  let sum = sizers.reduce((v, s) => v + s.size, 0);
  return sum > 0 ? sum / sizers.length : 0;
}


/**
 * Grow a sizer to the right by a positive delta and adjust neighbors.
 */
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
 * Normalize an array of positive values.
 */
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
