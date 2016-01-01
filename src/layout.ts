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
  IBoxSizing, boxSizing, sizeLimits
} from 'phosphor-domutil';

import {
  Message, sendMessage
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Property
} from 'phosphor-properties';

import {
  ChildMessage, ResizeMessage, Widget
} from 'phosphor-widget';


/**
 * The class name added to hidden split handles.
 */
const HIDDEN_CLASS = 'p-mod-hidden';

/**
 * The class name added to horizontal split panels.
 */
const HORIZONTAL_CLASS = 'p-mod-horizontal';

/**
 * The class name added to vertical split panels.
 */
const VERTICAL_CLASS = 'p-mod-vertical';


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
 * A factory object which creates handles for a split layout.
 */
export
interface IHandleFactory {
  /**
   * Create a new split handle for use with a split layout.
   */
  createHandle(): HTMLElement;
}


/**
 * A layout which arranges its children into resizable sections.
 */
export
class SplitLayout extends PanelLayout {
  /**
   * The static type of the constructor.
   */
  "constructor": typeof SplitLayout;

  /**
   * Construct a new split layout.
   *
   * @param factory - The handle factory for creating split handles.
   */
  constructor(factory: IHandleFactory) {
    super();
    this._factory = factory;
  }

  /**
   * Get the layout orientation for the split layout.
   */
  get orientation(): Orientation {
    return this._orientation;
  }

  /**
   * Set the layout orientation for the split layout.
   */
  set orientation(value: Orientation) {
    if (this._orientation === value) {
      return;
    }
    this._orientation = value;
    if (!this.parent) {
      return;
    }
    SplitLayoutPrivate.toggleOrientation(this.parent, value);
    this.parent.fit();
  }

  /**
   * Get the inter-element spacing for the split layout.
   */
  get spacing(): number {
    return this._spacing;
  }

  /**
   * Set the inter-element spacing for the split layout.
   */
  set spacing(value: number) {
    value = Math.max(0, value | 0);
    if (this._spacing === value) {
      return;
    }
    this._spacing = value;
    if (!this.parent) {
      return;
    }
    this.parent.fit();
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
    this._normed = true;
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
    return this._handles[index];
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
   * This will move the handle as close as possible to the desired
   * position. The sibling children will be adjusted as necessary.
   */
  moveHandle(index: number, position: number): void {
    // Bail if the index is invalid or the handle is hidden.
    let handle = this._handles[index];
    if (!handle || handle.classList.contains(HIDDEN_CLASS)) {
      return;
    }

    // Compute the delta movement for the handle.
    let delta: number;
    if (this._orientation === Orientation.Horizontal) {
      delta = position - handle.offsetLeft;
    } else {
      delta = position - handle.offsetTop;
    }

    // Bail if there is no handle movement.
    if (delta === 0) {
      return;
    }

    // Prevent item resizing unless needed.
    for (let sizer of this._sizers) {
      if (sizer.size > 0) sizer.sizeHint = sizer.size;
    }

    // Adjust the sizers to reflect the movement.
    if (delta > 0) {
      SplitLayoutPrivate.growSizer(this._sizers, index, delta);
    } else {
      SplitLayoutPrivate.shrinkSizer(this._sizers, index, -delta);
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
    SplitLayoutPrivate.toggleOrientation(this.parent, this.orientation);
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
    let handle = SplitLayoutPrivate.createHandle(this._factory);
    let average = SplitLayoutPrivate.averageSize(this._sizers);
    let sizer = SplitLayoutPrivate.createSizer(average);
    arrays.insert(this._sizers, index, sizer);
    arrays.insert(this._handles, index, handle);
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
    arrays.move(this._sizers, fromIndex, toIndex);
    arrays.move(this._handles, fromIndex, toIndex);
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
    let sizer = arrays.removeAt(this._sizers, index);
    let handle = arrays.removeAt(this._handles, index);
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
    if (SplitLayoutPrivate.IsIE) { // prevent flicker on IE
      sendMessage(this.parent, Widget.MsgFitRequest);
    } else {
      this.parent.fit();
    }
  }

  /**
   * A message handler invoked on a `'child-hidden'` message.
   */
  protected onChildHidden(msg: ChildMessage): void {
    if (SplitLayoutPrivate.IsIE) { // prevent flicker on IE
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
      this._update(msg.width, msg.height);
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.parent.isVisible) {
      this._update(-1, -1);
    }
  }

  /**
   * A message handler invoked on a `'fit-request'` message.
   */
  protected onFitRequest(msg: Message): void {
    if (this.parent.isAttached) {
      this._fit();
    }
  }

  /**
   * Fit the layout to the total size required by the child widgets.
   */
  private _fit(): void {
    // Update the handles and track the visible widget count.
    let nVisible = 0;
    let lastHandle: HTMLElement = null;
    for (let i = 0, n = this.childCount(); i < n; ++i) {
      let handle = this._handles[i];
      if (this.childAt(i).isHidden) {
        handle.classList.add(HIDDEN_CLASS);
      } else {
        handle.classList.remove(HIDDEN_CLASS);
        lastHandle = handle;
        nVisible++;
      }
    }

    // Hide the handle for the last visible child.
    if (lastHandle) lastHandle.classList.add(HIDDEN_CLASS);

    // Update the fixed space for the visible items.
    this._fixed = this._spacing * Math.max(0, nVisible - 1);

    // Setup the initial size limits.
    let minW = 0;
    let minH = 0;
    let maxW = Infinity;
    let maxH = Infinity;
    let horz = this._orientation === Orientation.Horizontal;
    if (horz) {
      minW = this._fixed;
      maxW = nVisible > 0 ? minW : maxW;
    } else {
      minH = this._fixed;
      maxH = nVisible > 0 ? minH : maxH;
    }

    // Update the sizers and computed size limits.
    for (let i = 0, n = this.childCount(); i < n; ++i) {
      let child = this.childAt(i);
      let sizer = this._sizers[i];
      if (sizer.size > 0) {
        sizer.sizeHint = sizer.size;
      }
      if (child.isHidden) {
        sizer.minSize = 0;
        sizer.maxSize = 0;
        continue;
      }
      let limits = sizeLimits(child.node);
      sizer.stretch = SplitLayout.getStretch(child);
      if (horz) {
        sizer.minSize = limits.minWidth;
        sizer.maxSize = limits.maxWidth;
        minW += limits.minWidth;
        maxW += limits.maxWidth;
        minH = Math.max(minH, limits.minHeight);
        maxH = Math.min(maxH, limits.maxHeight);
      } else {
        sizer.minSize = limits.minHeight;
        sizer.maxSize = limits.maxHeight;
        minH += limits.minHeight;
        maxH += limits.maxHeight;
        minW = Math.max(minW, limits.minWidth);
        maxW = Math.min(maxW, limits.maxWidth);
      }
    }

    // Update the box sizing and add it to the size constraints.
    let box = this._box = boxSizing(this.parent.node);
    minW += box.horizontalSum;
    minH += box.verticalSum;
    maxW += box.horizontalSum;
    maxH += box.verticalSum;

    // Update the parent's size constraints.
    let style = this.parent.node.style;
    style.minWidth = `${minW}px`;
    style.minHeight = `${minH}px`;
    style.maxWidth = maxW === Infinity ? 'none' : `${maxW}px`;
    style.maxHeight = maxH === Infinity ? 'none' : `${maxH}px`;

    // Notify the ancestor that it should fit immediately.
    let ancestor = this.parent.parent;
    if (ancestor) sendMessage(ancestor, Widget.MsgFitRequest);

    // Notify the parent that it should update immediately.
    sendMessage(this.parent, Widget.MsgUpdateRequest);
  }

  /**
   * Update the layout position and size of the child widgets.
   *
   * The parent offset dimensions should be `-1` if unknown.
   */
  private _update(offsetWidth: number, offsetHeight: number): void {
    // Bail early if there are no children to layout.
    if (this.childCount() === 0) {
      return;
    }

    // Measure the parent if the offset dimensions are unknown.
    if (offsetWidth < 0) {
      offsetWidth = this.parent.node.offsetWidth;
    }
    if (offsetHeight < 0) {
      offsetHeight = this.parent.node.offsetHeight;
    }

    // Ensure the parent box sizing data is computed.
    let box = this._box || (this._box = boxSizing(this.parent.node));

    // Compute the actual layout bounds adjusted for border and padding.
    let top = box.paddingTop;
    let left = box.paddingLeft;
    let width = offsetWidth - box.horizontalSum;
    let height = offsetHeight - box.verticalSum;

    // Compute the adjusted layout space.
    let space: number;
    let horz = this._orientation === Orientation.Horizontal;
    if (horz) {
      space = Math.max(0, width - this._fixed);
    } else {
      space = Math.max(0, height - this._fixed);
    }

    // Scale the size hints if they are normalized.
    if (this._normed) {
      for (let sizer of this._sizers) {
        sizer.sizeHint *= space;
      }
      this._normed = false;
    }

    // Distribute the layout space to the box sizers.
    boxCalc(this._sizers, space);

    // Layout the children using the computed box sizes.
    let spacing = this._spacing;
    for (let i = 0, n = this.childCount(); i < n; ++i) {
      let child = this.childAt(i);
      if (child.isHidden) {
        continue;
      }
      let handle = this._handles[i];
      let size = this._sizers[i].size;
      if (horz) {
        SplitLayoutPrivate.setGeometry(child, left, top, size, height);
        left += size;
        SplitLayoutPrivate.setHandleGeo(handle, left, top, spacing, height);
        left += spacing;
      } else {
        SplitLayoutPrivate.setGeometry(child, left, top, width, size);
        top += size;
        SplitLayoutPrivate.setHandleGeo(handle, left, top, width, spacing);
        top += spacing;
      }
    }
  }

  private _fixed = 0;
  private _spacing = 3;
  private _normed = false;
  private _box: IBoxSizing = null;
  private _factory: IHandleFactory;
  private _sizers: BoxSizer[] = [];
  private _handles: HTMLElement[] = [];
  private _orientation = Orientation.Horizontal;
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
 * The namespace for the `SplitLayout` class private data.
 */
namespace SplitLayoutPrivate {
  /**
   * A flag indicating whether the browser is IE.
   */
  export
  const IsIE = /Trident/.test(navigator.userAgent);

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
   * Create a new split handle using the given factory.
   */
  export
  function createHandle(factory: IHandleFactory): HTMLElement {
    let handle = factory.createHandle();
    handle.style.position = 'absolute';
    return handle;
  }

  /**
   * Toggle the CSS orientation class for the given widget.
   */
  export
  function toggleOrientation(widget: Widget, orient: Orientation): void {
    widget.toggleClass(HORIZONTAL_CLASS, orient === Orientation.Horizontal);
    widget.toggleClass(VERTICAL_CLASS, orient === Orientation.Vertical);
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
   * Set the layout geometry of a child widget.
   */
  export
  function setGeometry(widget: Widget, left: number, top: number, width: number, height: number): void {
    let resized = false;
    let style = widget.node.style;
    let rect = rectProperty.get(widget);
    if (rect.top !== top) {
      rect.top = top;
      style.top = `${top}px`;
    }
    if (rect.left !== left) {
      rect.left = left;
      style.left = `${left}px`;
    }
    if (rect.width !== width) {
      resized = true;
      rect.width = width;
      style.width = `${width}px`;
    }
    if (rect.height !== height) {
      resized = true;
      rect.height = height;
      style.height = `${height}px`;
    }
    if (resized) {
      sendMessage(widget, new ResizeMessage(width, height));
    }
  }

  /**
   * Set the layout geometry of a split handle.
   */
  export
  function setHandleGeo(handle: HTMLElement, left: number, top: number, width: number, height: number): void {
    let style = handle.style;
    style.top = `${top}px`;
    style.left = `${left}px`;
    style.width = `${width}px`;
    style.height = `${height}px`;
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
   * The change handler for the attached child properties.
   */
  function onChildPropertyChanged(child: Widget): void {
    let parent = child.parent;
    let layout = parent && parent.layout;
    if (layout instanceof SplitLayout) parent.fit();
  }
}
