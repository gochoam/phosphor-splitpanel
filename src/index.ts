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
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ChildMessage, MSG_AFTER_ATTACH, MSG_BEFORE_DETACH, MSG_LAYOUT_REQUEST,
  ResizeMessage, Widget
} from 'phosphor-widget';

import './index.css';


/**
 * `p-SplitPanel`: the class name added to SplitPanel instances.
 */
export
const SPLIT_PANEL_CLASS = 'p-SplitPanel';

/**
 * `p-SplitHandle`: the class name for a split handle.
 */
export
const SPLIT_HANDLE_CLASS = 'p-SplitHandle';

/**
 * `p-SplitHandle-overlay`: the class name for a split handle overlay.
 */
export
const OVERLAY_CLASS = 'p-SplitHandle-overlay';

/**
 * `p-mod-horizontal`: the class name added to horizontal panels and handles.
 */
export
const HORIZONTAL_CLASS = 'p-mod-horizontal';

/**
 * `p-mod-vertical`: the class name added to vertical panels and handles.
 */
export
const VERTICAL_CLASS = 'p-mod-vertical';

/**
 * `p-mod-hidden`: The class name added to hidden split handles.
 */
export
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
 * A widget which arranges its children into resizable sections.
 */
export
class SplitPanel extends Widget {
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
    value: Orientation.Horizontal,
    changed: onOrientationChanged,
  });

  /**
   * The property descriptor for the split panel handle size.
   *
   * The controls the size of the split handles placed between the
   * children of the panel, in pixels. The default value is `3`.
   *
   * **See also:** [[handleSize]]
   */
  static handleSizeProperty = new Property<SplitPanel, number>({
    value: 3,
    coerce: (owner, value) => Math.max(0, value | 0),
    changed: onHandleSizeChanged,
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
    value: 0,
    coerce: (owner, value) => Math.max(0, value | 0),
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
    this._items.length = 0;
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
   * Get the size of the split handles.
   *
   * #### Notes
   * This is a pure delegate to the [[handleSizeProperty]].
   */
  get handleSize(): number {
    return SplitPanel.handleSizeProperty.get(this);
  }

  /**
   * Set the the size of the split handles.
   *
   * #### Notes
   * This is a pure delegate to the [[handleSizeProperty]].
   */
  set handleSize(size: number) {
    SplitPanel.handleSizeProperty.set(this, size);
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
    var totalSize: number;
    if (this.orientation === Orientation.Horizontal) {
      totalSize = this.node.clientWidth - this._fixedSpace;
    } else {
      totalSize = this.node.clientHeight - this._fixedSpace;
    }
    var normSizes = normalize(sizes);
    var n = Math.min(this._sizers.length, normSizes.length);
    for (var i = 0; i < n; ++i) {
      var hint = Math.round(normSizes[i] * totalSize);
      var sizer = this._sizers[i];
      sizer.sizeHint = hint;
      sizer.size = hint;
    }
    this.update();
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
      this._evtMouseDown(<MouseEvent>event);
      break;
    case 'mouseup':
      this._evtMouseUp(<MouseEvent>event);
      break;
    case 'mousemove':
      this._evtMouseMove(<MouseEvent>event);
      break;
    }
  }

  /**
   * A message handler invoked on a `'child-added'` message.
   */
  protected onChildAdded(msg: ChildMessage): void {
    Property.getChanged(msg.child).connect(this._onPropertyChanged, this);
    var item = createItem(msg.child, this.orientation);
    var sizer = createSizer(averageSize(this._sizers));
    arrays.insert(this._items, msg.currentIndex, item);
    arrays.insert(this._sizers, msg.currentIndex, sizer);
    this.node.appendChild(item.widget.node);
    this.node.appendChild(item.handle.node);
    if (this.isAttached) sendMessage(msg.child, MSG_AFTER_ATTACH);
    postMessage(this, MSG_LAYOUT_REQUEST);
  }

  /**
   * A message handler invoked on a `'child-removed'` message.
   */
  protected onChildRemoved(msg: ChildMessage): void {
    Property.getChanged(msg.child).disconnect(this._onPropertyChanged, this);
    var item = arrays.removeAt(this._items, msg.previousIndex);
    arrays.removeAt(this._sizers, msg.previousIndex);
    if (this.isAttached) sendMessage(msg.child, MSG_BEFORE_DETACH);
    this.node.removeChild(item.widget.node);
    this.node.removeChild(item.handle.node);
    postMessage(this, MSG_LAYOUT_REQUEST);
  }

  /**
   * A message handler invoked on a `'child-moved'` message.
   */
  protected onChildMoved(msg: ChildMessage): void {
    arrays.move(this._items, msg.previousIndex, msg.currentIndex);
    arrays.move(this._sizers, msg.previousIndex, msg.currentIndex);
    postMessage(this, MSG_LAYOUT_REQUEST);
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    this.update(true);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('mousedown', this);
    postMessage(this, MSG_LAYOUT_REQUEST);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('mousedown', this);
  }

  /**
   * A message handler invoked on a `'child-shown'` message.
   */
  protected onChildShown(msg: ChildMessage): void {
    postMessage(this, MSG_LAYOUT_REQUEST);
  }

  /**
   * A message handler invoked on a `'child-hidden'` message.
   */
  protected onChildHidden(msg: ChildMessage): void {
    postMessage(this, MSG_LAYOUT_REQUEST);
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: ResizeMessage): void {
    if (this.isVisible) {
      var width = msg.width < 0 ? this.node.offsetWidth : msg.width;
      var height = msg.height < 0 ? this.node.offsetHeight : msg.height;
      this._layoutItems(width, height);
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.isVisible) {
      this._layoutItems(this.node.offsetWidth, this.node.offsetHeight);
    }
  }

  /**
   * A message handler invoked on a `'layout-request'` message.
   */
  protected onLayoutRequest(msg: Message): void {
    this._setupGeometry();
  }

  /**
   * Update the split items and size constraints of the panel.
   */
  private _setupGeometry(): void {
    // Update the handles and track the visible item count.
    var visibleCount = 0;
    var orientation = this.orientation;
    var lastVisibleItem: SplitItem = null;
    for (var i = 0, n = this._items.length; i < n; ++i) {
      var item = this._items[i];
      item.handle.hidden = item.widget.hidden;
      item.handle.orientation = orientation;
      if (!item.widget.hidden) {
        lastVisibleItem = item;
        visibleCount++;
      }
    }

    // Hide the last visible handle and update the fixed space.
    if (lastVisibleItem) lastVisibleItem.handle.hidden = true;
    this._fixedSpace = this.handleSize * Math.max(0, visibleCount - 1);

    // Compute new size constraints for the split panel.
    var minW = 0;
    var minH = 0;
    var maxW = Infinity;
    var maxH = Infinity;
    if (orientation === Orientation.Horizontal) {
      minW = this._fixedSpace;
      maxW = visibleCount > 0 ? minW : maxW;
      for (var i = 0, n = this._items.length; i < n; ++i) {
        var item = this._items[i];
        var sizer = this._sizers[i];
        if (sizer.size > 0) {
          sizer.sizeHint = sizer.size;
        }
        if (item.widget.hidden) {
          sizer.minSize = 0;
          sizer.maxSize = 0;
          continue;
        }
        var limits = sizeLimits(item.widget.node);
        sizer.stretch = SplitPanel.getStretch(item.widget);
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
      for (var i = 0, n = this._items.length; i < n; ++i) {
        var item = this._items[i];
        var sizer = this._sizers[i];
        if (sizer.size > 0) {
          sizer.sizeHint = sizer.size;
        }
        if (item.widget.hidden) {
          sizer.minSize = 0;
          sizer.maxSize = 0;
          continue;
        }
        var limits = sizeLimits(item.widget.node);
        sizer.stretch = SplitPanel.getStretch(item.widget);
        sizer.minSize = limits.minHeight;
        sizer.maxSize = limits.maxHeight;
        minH += limits.minHeight;
        maxH += limits.maxHeight;
        minW = Math.max(minW, limits.minWidth);
        maxW = Math.min(maxW, limits.maxWidth);
      }
    }

    // Add the box sizing to the size constraints.
    var box = this._box = boxSizing(this.node);
    minW += box.horizontalSum;
    minH += box.verticalSum;
    maxW += box.horizontalSum;
    maxH += box.verticalSum;

    // Update the inline style size constraints.
    var style = this.node.style;
    style.minWidth = minW + 'px';
    style.minHeight = minH + 'px';
    style.maxWidth = maxW < Infinity ? maxW + 'px' : '';
    style.maxHeight = maxH < Infinity ? maxH + 'px' : '';

    // Notifiy the parent that it should relayout.
    if (this.parent) sendMessage(this.parent, MSG_LAYOUT_REQUEST);

    // Update the layout for the child widgets.
    this.update(true);
  }

  /**
   * Layout the items using the given offset width and height.
   */
  private _layoutItems(offsetWidth: number, offsetHeight: number): void {
    // Bail early if their are no items to arrange.
    if (this._items.length === 0) {
      return;
    }

    // Ensure the box sizing is computed for the panel.
    var box = this._box || (this._box = boxSizing(this.node));

    // Compute the actual layout bounds adjusted for border and padding.
    var top = box.paddingTop;
    var left = box.paddingLeft;
    var width = offsetWidth - box.horizontalSum;
    var height = offsetHeight - box.verticalSum;

    // Distribute the layout space and layout the items.
    var handleSize = this.handleSize;
    if (this.orientation === Orientation.Horizontal) {
      boxCalc(this._sizers, Math.max(0, width - this._fixedSpace));
      for (var i = 0, n = this._items.length; i < n; ++i) {
        var item = this._items[i];
        if (item.widget.hidden) {
          continue;
        }
        var size = this._sizers[i].size;
        item.layoutWidget(left, top, size, height);
        item.layoutHandle(left + size, top, handleSize, height);
        left += size + handleSize;
      }
    } else {
      boxCalc(this._sizers, Math.max(0, height - this._fixedSpace));
      for (var i = 0, n = this._items.length; i < n; ++i) {
        var item = this._items[i];
        if (item.widget.hidden) {
          continue;
        }
        var size = this._sizers[i].size;
        item.layoutWidget(left, top, width, size);
        item.layoutHandle(left, top + size, width, handleSize);
        top += size + handleSize;
      }
    }
  }

  /**
   * Handle the `'mousedown'` event for the split panel.
   */
  private _evtMouseDown(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }
    var index = this._findHandleIndex(<HTMLElement>event.target);
    if (index === -1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    document.addEventListener('mouseup', this, true);
    document.addEventListener('mousemove', this, true);
    var delta: number;
    var node = this._items[index].handle.node;
    if (this.orientation === Orientation.Horizontal) {
      delta = event.clientX - node.getBoundingClientRect().left;
    } else {
      delta = event.clientY - node.getBoundingClientRect().top;
    }
    var override = overrideCursor(window.getComputedStyle(node).cursor);
    this._pressData = { index: index, delta: delta, override: override };
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
   * Handle the `'mousemove'` event for the split panel.
   */
  private _evtMouseMove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    var pos: number;
    var data = this._pressData;
    var rect = this.node.getBoundingClientRect();
    if (this.orientation === Orientation.Horizontal) {
      pos = event.clientX - data.delta - rect.left;
    } else {
      pos = event.clientY - data.delta - rect.top;
    }
    this._moveHandle(data.index, pos);
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
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('mousemove', this, true);
  }

  /**
   * Move a splitter handle to the specified client position.
   */
  private _moveHandle(index: number, pos: number): void {
    // Bail if the handle is invalid or hidden.
    var item = this._items[index];
    if (!item || item.handle.hidden) {
      return;
    }

    // Compute the delta movement for the handle.
    var delta: number;
    if (this.orientation === Orientation.Horizontal) {
      delta = pos - item.handle.node.offsetLeft;
    } else {
      delta = pos - item.handle.node.offsetTop;
    }
    if (delta === 0) {
      return;
    }

    // Prevent item resizing unless needed.
    for (var i = 0, n = this._sizers.length; i < n; ++i) {
      var sizer = this._sizers[i];
      if (sizer.size > 0) {
        sizer.sizeHint = sizer.size;
      }
    }

    // Adjust the sizers to reflect the movement.
    if (delta > 0) {
      growSizer(this._sizers, index, delta);
    } else {
      shrinkSizer(this._sizers, index, -delta);
    }

    // Update the layout of the widget items. The message is posted
    // instead of sent because the mouse move event frequency can
    // outpace the browser's ability to layout, leading to choppy
    // handle movement, especially on IE. Posting ensures we don't
    // try to layout faster than the browser can handle.
    this.update();
  }

  /**
   * Find the index of the split handle which contains the given target.
   */
  private _findHandleIndex(target: HTMLElement): number {
    for (var i = 0, n = this._items.length; i < n; ++i) {
      if (this._items[i].handle.node.contains(target)) return i;
    }
    return -1;
  }

  /**
   * The handler for the child property changed signal.
   */
  private _onPropertyChanged(sender: Widget, args: IChangedArgs): void {
    if (args.property === SplitPanel.stretchProperty) {
      postMessage(this, MSG_LAYOUT_REQUEST);
    }
  }

  private _fixedSpace = 0;
  private _box: IBoxSizing = null;
  private _sizers: BoxSizer[] = [];
  private _items: SplitItem[] = [];
  private _pressData: IPressData = null;
}


/**
 * The change handler for the [[orientationProperty]].
 */
function onOrientationChanged(owner: SplitPanel, old: Orientation, value: Orientation): void {
  owner.toggleClass(HORIZONTAL_CLASS, value === Orientation.Horizontal);
  owner.toggleClass(VERTICAL_CLASS, value === Orientation.Vertical);
  postMessage(owner, MSG_LAYOUT_REQUEST);
}


/**
 * The change handler for the [[handleSizeProperty]].
 */
function onHandleSizeChanged(owner: SplitPanel, old: number, value: number): void {
  postMessage(owner, MSG_LAYOUT_REQUEST);
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
    var node = document.createElement('div');
    var overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    node.appendChild(overlay);
    return node;
  }

  /**
   * Construct a new split handle.
   */
  constructor(orientation: Orientation) {
    super();
    this.addClass(SPLIT_HANDLE_CLASS);
    this.orientation = orientation;
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

  private _hidden = false;
  private _orientation: Orientation = void 0;
}


/**
 * A class which assists with the layout of a widget and split handle.
 */
class SplitItem {
  /**
   * Construct a new split item.
   */
  constructor(widget: Widget, handle: SplitHandle) {
    this._widget = widget;
    this._handle = handle;
  }

  /**
   * Get the widget for the item.
   */
  get widget(): Widget {
    return this._widget;
  }

  /**
   * Get the split handle for the item.
   */
  get handle(): SplitHandle {
    return this._handle;
  }

  /**
   * Update the layout geometry for the widget.
   */
  layoutWidget(left: number, top: number, width: number, height: number): void {
    var resized = false;
    var style = this._widget.node.style;
    if (left !== this._left) {
      this._left = left;
      style.left = left + 'px';
    }
    if (top !== this._top) {
      this._top = top;
      style.top = top + 'px';
    }
    if (width !== this._width) {
      resized = true;
      this._width = width;
      style.width = width + 'px';
    }
    if (height !== this._height) {
      resized = true;
      this._height = height;
      style.height = height + 'px';
    }
    if (resized) sendMessage(this._widget, new ResizeMessage(width, height));
  }

  /**
   * Update the layout geometry for the handle.
   */
  layoutHandle(left: number, top: number, width: number, height: number): void {
    var style = this._handle.node.style;
    if (left !== this._handleLeft) {
      this._handleLeft = left;
      style.left = left + 'px';
    }
    if (top !== this._handleTop) {
      this._handleTop = top;
      style.top = top + 'px';
    }
    if (width !== this._handleWidth) {
      this._handleWidth = width;
      style.width = width + 'px';
    }
    if (height !== this._handleHeight) {
      this._handleHeight = height;
      style.height = height + 'px';
    }
  }

  private _widget: Widget;
  private _handle: SplitHandle;
  private _top = NaN;
  private _left = NaN;
  private _width = NaN;
  private _height = NaN;
  private _handleTop = NaN;
  private _handleLeft = NaN;
  private _handleWidth = NaN;
  private _handleHeight = NaN;
}


/**
 * Create a new split item with the given widget and orientation.
 */
function createItem(widget: Widget, orientation: Orientation): SplitItem {
  return new SplitItem(widget, new SplitHandle(orientation));
}


/**
 * Create a new box sizer with the given size hint.
 */
function createSizer(size: number): BoxSizer {
  var sizer = new BoxSizer();
  sizer.sizeHint = size | 0;
  return sizer;
}


/**
 * Compute the average size of the given box sizers.
 */
function averageSize(sizers: BoxSizer[]): number {
  var sum = sizers.reduce((v, s) => v + s.size, 0);
  return sum > 0 ? sum / sizers.length : 0;
}


/**
 * Grow a sizer to the right by a positive delta and adjust neighbors.
 */
function growSizer(sizers: BoxSizer[], index: number, delta: number): void {
  var growLimit = 0;
  for (var i = 0; i <= index; ++i) {
    var sizer = sizers[i];
    growLimit += sizer.maxSize - sizer.size;
  }
  var shrinkLimit = 0;
  for (var i = index + 1, n = sizers.length; i < n; ++i) {
    var sizer = sizers[i];
    shrinkLimit += sizer.size - sizer.minSize;
  }
  delta = Math.min(delta, growLimit, shrinkLimit);
  var grow = delta;
  for (var i = index; i >= 0 && grow > 0; --i) {
    var sizer = sizers[i];
    var limit = sizer.maxSize - sizer.size;
    if (limit >= grow) {
      sizer.sizeHint = sizer.size + grow;
      grow = 0;
    } else {
      sizer.sizeHint = sizer.size + limit;
      grow -= limit;
    }
  }
  var shrink = delta;
  for (var i = index + 1, n = sizers.length; i < n && shrink > 0; ++i) {
    var sizer = sizers[i];
    var limit = sizer.size - sizer.minSize;
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
  var growLimit = 0;
  for (var i = index + 1, n = sizers.length; i < n; ++i) {
    var sizer = sizers[i];
    growLimit += sizer.maxSize - sizer.size;
  }
  var shrinkLimit = 0;
  for (var i = 0; i <= index; ++i) {
    var sizer = sizers[i];
    shrinkLimit += sizer.size - sizer.minSize;
  }
  delta = Math.min(delta, growLimit, shrinkLimit);
  var grow = delta;
  for (var i = index + 1, n = sizers.length; i < n && grow > 0; ++i) {
    var sizer = sizers[i];
    var limit = sizer.maxSize - sizer.size;
    if (limit >= grow) {
      sizer.sizeHint = sizer.size + grow;
      grow = 0;
    } else {
      sizer.sizeHint = sizer.size + limit;
      grow -= limit;
    }
  }
  var shrink = delta;
  for (var i = index; i >= 0 && shrink > 0; --i) {
    var sizer = sizers[i];
    var limit = sizer.size - sizer.minSize;
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
  var n = values.length;
  if (n === 0) {
    return [];
  }
  var sum = 0;
  for (var i = 0; i < n; ++i) {
    sum += values[i];
  }
  var result = new Array<number>(n);
  if (sum === 0) {
    for (var i = 0; i < n; ++i) {
      result[i] = 1 / n;
    }
  } else {
    for (var i = 0; i < n; ++i) {
      result[i] = values[i] / sum;
    }
  }
  return result;
}
