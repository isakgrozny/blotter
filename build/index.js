module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	const engine = __webpack_require__(1);

	module.exports = {
	  engine
	};


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	const inkjs = __webpack_require__(2);
	const tippy = __webpack_require__(3);

	let story;

	/* Find the elements where we'll be putting content */

	const stageDiv = document.querySelector('#story-stage');
	const choiceDiv = document.querySelector('#choices');

	if (!stageDiv || !choiceDiv) {
	  throw new Error('Unable to select content and choice container elements.');
	}

	/*
	  The scrolling rate is the *average* rate of scrolling, in pixels by
	  millisecond. Since we're using an easing function to animate the scroll,
	  the actual change from one frame to the next will vary, and also depend
	  on the real framerate of the device as given to the requestAnimationFrame
	  callback.
	*/
	const DEFAULT_SCROLLING_RATE = 0.25;

	const scroll = {
	  isScrolling: false,

	  start () {
	    if (this.isScrolling) return new Promise(resolve => resolve()); // shouldn't happen
	    this.isScrolling = true;
	    const scrollRate = DEFAULT_SCROLLING_RATE;

	    return new Promise(resolve => {
	      /* First of all, if there's no scrolling to be done, just resolve immediately. */
	      if (stageDiv.scrollHeight === stageDiv.clientHeight) {
	        return resolve();
	      }
	      const scrollStart = performance.now();
	      const initialPos = stageDiv.scrollTop;
	      const distanceToScroll = stageDiv.scrollHeight - (initialPos + stageDiv.clientHeight);
	      const duration = distanceToScroll / scrollRate;
	      let rate = 0;

	      function easeIn (position) {
	        return Math.pow(position, 5);
	      }

	      function easeOut (position) {
	        return 1 - Math.pow(1 - position, 2);
	      }

	      function easing (timeDelta) {
	        // Cubic ease-in-out adapted from Robert Penner
	        const position = (timeDelta / duration);
	        if (position >= 1) {
	          // We should be done already; this is usually caused by switching out
	          // of the page, causing the browser to not render a new animation
	          // frame for several seconds.
	          return distanceToScroll;
	        }
	        const half = distanceToScroll / 2;
	        return position < 0.5 ?
	          half * easeIn(position * 2)
	        : half + half * easeOut((position - 0.5) * 2);
	        // return distanceToScroll * (1 - Math.pow(1 - (timeDelta / duration), 3));
	      }

	      function step (timestamp) {
	        // Displacement equals vo * delta t + 0.5 * accel * t^2
	        const timeDelta = timestamp - scrollStart;
	        const displacement = easing(timeDelta);
	        // Obviously we can't scroll half a pixel, so we round to the nearest integer
	        stageDiv.scrollTop = Math.round(initialPos + displacement);
	        if (displacement >= distanceToScroll) {
	          // We're done scrolling
	          return resolve();
	        }
	        return window.requestAnimationFrame(step);
	      }
	      return window.requestAnimationFrame(step);
	    })
	      .then(() => { this.isScrolling = false; });
	  }
	}

	function emphasis (line) {
	  const grodyRegex = /(\s|^)(_{1,2})(\w[^_]*\S)(\2)(\W)/;
	  if (!line.match(grodyRegex)) return line; // No italics here
	  const alteredLine = line.replace(grodyRegex, (match, p1, p2, p3, p4, p5) => {
	    if (p2 === '_') return `${p1}<em>${p3}</em>${p5}`;
	    return `${p1}<strong>${p3}</strong>${p5}`
	  });
	  return emphasis(alteredLine);
	}

	function quoter (line) {
	  const grodyRegex = /(^|\s)(['"])(.+?)(\2)(\W|$)/;
	  if (!line.match(grodyRegex)) return line;
	  const alteredLine = line.replace(grodyRegex, (match, p1, p2, p3, p4, p5) => {
	    if (p2 === '"') return `${p1}&ldquo;${p3}&rdquo;${p5}`;
	    return `${p1}&lsquo;${p3}&rsquo;${p5}`
	  });
	  return quoter(alteredLine);
	}

	function dasher (line) {
	  return line
	    .replace(/ - /g, ' &ndash; ')
	    .replace(/ -- /g, '&mdash;');
	}

	function format (line) {
	  return emphasis(quoter(dasher(line)));
	}

	/* Create an element (usually p, but also h1-h6) and format it. */
	function createLineElement (line, elemType, classes) {
	  let content = line;
	  /* --- DEPRECATED FEATURE --- */
	  const matches = line.match(/^(h\d) (.+)/);
	  if (matches) {
	    // Line starts with the name of a title element so let's use that
	    elemType = matches[1];
	    content = matches[2];
	  }
	  /* --- DEPRECATED FEATURE --- */
	  const elem = document.createElement(elemType);
	  elem.innerHTML = format(content);
	  elem.classList.add(...classes);
	  return elem;
	}

	/* Helper for the next function */
	function oneTimeCB (cb) {
	  let used = false;
	  return function () {
	    if (used) return;
	    used = true;
	    cb();
	  }
	}

	/* Decode classes and elements from a list of Ink tags. */
	/* Returns a {elementType, classes} object. Defaults to "p" and nothing. */
	function decodeTags (tags) {
	  let elementType = 'p';
	  const classes = [];
	  tags.forEach(tag => {
	    if (typeof tag !== 'string') return;
	    const foundTag = tag.match(/^<([\w-]+)>$/);
	    if (foundTag) {
	      elementType = foundTag[1];
	      return;
	    }
	    const foundClass = tag.match(/^\.([\w-]+)$/);
	    if (foundClass) {
	      classes.push(foundClass[1]);
	      return;
	    }
	  });
	  return {elementType, classes};
	}

	/* Insert a line of content into the output */
	/* Returns a Promise that resolves when the animation on the inserted element
	   ends or two seconds elapse, whichever happens first.

	   The two seconds condition is not supposed to be called, and is instead just a
	   fallback to deal with possible weirdness/race conditions browsers can have.*/
	function insertLine () {
	  const line = story.Continue();
	  const {elementType, classes} = decodeTags(story.currentTags);
	  const elem = createLineElement(line, elementType, classes);
	  return new Promise(resolve => {
	    const cb = oneTimeCB(resolve);
	    elem.addEventListener('animationend', cb);
	    setTimeout(cb, 2000);
	    stageDiv.appendChild(elem);
	  });
	}

	/* The main game loop; progress the story by an additional step. */
	function progressGame () {
	  Promise.all([insertLine(), scroll.start()]).then(() => {
	    tippy('footnote', {
	      animation: 'shift-away',
	      arrow: 'false',
	      trigger: 'click',
	      interactive: 'true',
	      multiple: 'true'
	    });
	    if (!story.canContinue) {
	      placeChoices();
	    } else {
	      progressGame();
	    }
	  })
	}

	// This flag is adhockery to prevent a race condition where the player can
	// click on a choice before they have fully animated in.
	let choicesAnimating = false;

	// Create a listener function to attach to one of the li elements that
	// represents a player choice.
	function choiceListener(index) {
	  return function (event) {
	    event.preventDefault();
	    if (choicesAnimating) return;
	    clearChoiceListeners();
	    story.ChooseChoiceIndex(index);
	    clearOldChoices().then(() => progressGame());
	  }
	}

	// Attach that listener to the element.
	function createChoiceListener(li, index) {
	  li.clickListener = choiceListener(index);
	  li.addEventListener('click', li.clickListener);
	  li.clearListener = (function () {
	    this.removeEventListener('click', this.clickListener);
	  }).bind(li);
	}

	// Clean up event listeners from choices once one of them was selected.
	function clearChoiceListeners() {
	  const lis = document.querySelectorAll('li');
	  Array.from(lis).forEach(li => {
	    if (li.clearListener) li.clearListener();
	  })
	}

	// Create the ul element that contains a batch of choices.
	function createChoiceUl () {
	  const lis = story.currentChoices
	    .map(choice => {
	      const li = document.createElement('li');
	      li.innerHTML = choice.text;
	      createChoiceListener(li, choice.index);
	      return li;
	    });
	  const ul = document.createElement('ul');
	  Array.from(lis).forEach(li => ul.appendChild(li));
	  ul.className = "choices current";
	  return ul;
	}

	// Insert a choice list into the container div.
	function placeChoices () {
	  const ul = createChoiceUl();
	  ul.addEventListener('animationend', () => choicesAnimating = false);
	  choicesAnimating = true;
	  choiceDiv.appendChild(ul);
	}

	// Mark used choice lists as old and remove them from the view.
	function clearOldChoices () {
	  const oldChoices = choiceDiv.querySelector('.choices.current');
	  return new Promise(resolve => {
	    oldChoices.addEventListener('transitionend', () => {
	      oldChoices.remove();
	      resolve();
	    });
	    oldChoices.className = "choices old";
	  })
	}

	function blotter (storyData) {

	  story = new inkjs.Story(storyData);

	  return {
	    start () {
	      progressGame();
	    },
	    story
	  }
	}

	module.exports = blotter;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define('inkjs', ['exports'], factory) :
		(factory((global.inkjs = global.inkjs || {})));
	}(this, (function (exports) { 'use strict';

		class Path$1{
			constructor(/*polymorphic constructor*/){
				this._isRelative;
				this._components = [];
				
				if (typeof arguments[0] == 'string'){
					this.componentsString = arguments[0];
				}
				else if (arguments[0] instanceof Component && arguments[1] instanceof Path$1){
					this._components.push(arguments[0]);
					this._components = this._components.concat(arguments[1]);
				}
				else if (arguments[0] instanceof Array){
					this._components = this._components.concat(arguments[0]);
					this._isRelative = !!arguments[1];
				}
			}
			get isRelative(){
				return this._isRelative;
			}
			get components(){
				return this._components;
			}
			get head(){
				if (this.components.length > 0) {
					return this.components[0];
				} else {
					return null;
				}
			}
			get tail(){
				if (this.components.length >= 2) {
					var tailComps = this.components.slice(1, this.components.length);//careful, the original code uses length-1 here. This is because the second argument of List.GetRange is a number of elements to extract, wherease Array.slice uses an index
					return new Path$1(tailComps);
				}
				else {
					return Path$1.self;
				}
			}
			get length(){
				return this.components.length;
			}
			get lastComponent(){
				if (this.components.length > 0) {
					return this.components[this.components.length - 1];
				} else {
					return null;
				}
			}
			get containsNamedComponent(){
				for (var i = 0, l = this.components.length; i < l; i++){
					if (!this.components[i].isIndex){
						return true;
					}
				}
				return false;
			}
			static get self(){
				var path = new Path$1();
				path._isRelative = true;
				return path;
			}
			
			PathByAppendingPath(pathToAppend){
				var p = new Path$1();

				var upwardMoves = 0;
				for (var i = 0; i < pathToAppend.components.length; ++i) {
					if (pathToAppend.components[i].isParent) {
						upwardMoves++;
					} else {
						break;
					}
				}

				for (var i = 0; i < this.components.length - upwardMoves; ++i) {
					p.components.push(this.components[i]);
				}

				for(var i = upwardMoves; i < pathToAppend.components.length; ++i) {
					p.components.push(pathToAppend.components[i]);
				}

				return p;
			}
			get componentsString(){
				var compsStr = this.components.join(".");
				if (this.isRelative)
					return "." + compsStr;
				else
					return compsStr;
			}
			set componentsString(value){
				this.components.length = 0;

				var componentsStr = value;
				
				if (componentsStr == null || componentsStr == '') return;

				// When components start with ".", it indicates a relative path, e.g.
				//   .^.^.hello.5
				// is equivalent to file system style path:
				//  ../../hello/5
				if (componentsStr[0] == '.') {
					this._isRelative = true;
					componentsStr = componentsStr.substring(1);
				}

				var componentStrings = componentsStr.split('.');
				componentStrings.forEach(str => {
					//we need to distinguish between named components that start with a number, eg "42somewhere", and indexed components
					//the normal parseInt won't do for the detection because it's too relaxed.
					//see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
					if (/^(\-|\+)?([0-9]+|Infinity)$/.test(str)){
						this.components.push(new Component(parseInt(str)));
					}
					else{
						this.components.push(new Component(str));
					}
				});
			}
			toString(){
				return this.componentsString;
			}
			Equals(otherPath){
				if (otherPath == null)
					return false;

				if (otherPath.components.length != this.components.length)
					return false;

				if (otherPath.isRelative != this.isRelative)
					return false;
				
				//the original code uses SequenceEqual here, so we need to iterate over the components manually.
				for (var i = 0, l = otherPath.components.length; i < l; i++){
					//it's not quite clear whether this test should use Equals or a simple == operator, see https://github.com/y-lohse/inkjs/issues/22
					if (!otherPath.components[i].Equals(this.components[i])) return false;
				}

				return true;
			}
		}

		class Component{
			constructor(indexOrName){
				if (typeof indexOrName == 'string'){
					this._index = -1;
					this._name = indexOrName;
				}
				else{
					this._index = parseInt(indexOrName);
					this._name = null;
				}
			}
			get index(){
				return this._index;
			}
			get name(){
				return this._name;
			}
			get isIndex(){
				return this.index >= 0;
			}
			get isParent(){
				return this.name == Path$1.parentId;
			}
			
			static ToParent(){
				return new Component(Path$1.parentId);
			}
			toString(){
				if (this.isIndex) {
					return this.index.toString();
				} else {
					return this.name;
				}
			}
			Equals(otherComp){
				if (otherComp != null && otherComp.isIndex == this.isIndex) {
					if (this.isIndex) {
						return this.index == otherComp.index;   
					} else {
						return this.name == otherComp.name;
					}
				}

				return false;
			}
		}

		Path$1.parentId = "^";
		Path$1.Component = Component;

		class Object$1{
			constructor(){
				this.parent = null;
				this._path = null;
			}
			get path(){
				if (this._path == null) {

					if (this.parent == null) {
						this._path = new Path$1();
					} else {
						// Maintain a Stack so that the order of the components
						// is reversed when they're added to the Path.
						// We're iterating up the hierarchy from the leaves/children to the root.
						var comps = [];

						var child = this;
		//				Container container = child.parent as Container;
						var container = child.parent;

						while (container instanceof Container) {

							var namedChild = child;
							if (namedChild.name && namedChild.hasValidName) {
								comps.unshift(new Path$1.Component(namedChild.name));
							} else {
								comps.unshift(new Path$1.Component(container.content.indexOf(child)));
							}

							child = container;
		//					container = container.parent as Container;
							container = container.parent;
						}

						this._path = new Path$1(comps);
					}

				}

				return this._path;
			}
			get rootContentContainer(){
				var ancestor = this;
				while (ancestor.parent) {
					ancestor = ancestor.parent;
				}
				return ancestor;
			}
			
			ResolvePath(path){
				if (path.isRelative) {
					var nearestContainer = this;

					if (nearestContainer instanceof Container === false) {
						if (this.parent == null) console.warn("Can't resolve relative path because we don't have a parent");
						
						nearestContainer = this.parent;
						if (nearestContainer.constructor.name !== 'Container') console.warn("Expected parent to be a container");
						
						//Debug.Assert (path.components [0].isParent);
						path = path.tail;
					}
					
					return nearestContainer.ContentAtPath(path);
				} else {
					return this.rootContentContainer.ContentAtPath(path);
				}
			}
			ConvertPathToRelative(globalPath){
				var ownPath = this.path;

				var minPathLength = Math.min(globalPath.components.length, ownPath.components.length);
				var lastSharedPathCompIndex = -1;

				for (var i = 0; i < minPathLength; ++i) {
					var ownComp = ownPath.components[i];
					var otherComp = globalPath.components[i];

					if (ownComp.Equals(otherComp)) {
						lastSharedPathCompIndex = i;
					} else {
						break;
					}
				}

				// No shared path components, so just use global path
				if (lastSharedPathCompIndex == -1)
					return globalPath;

				var numUpwardsMoves = (ownPath.components.length-1) - lastSharedPathCompIndex;

				var newPathComps = [];

				for(var up = 0; up < numUpwardsMoves; ++up)
					newPathComps.push(Path$1.Component.ToParent());

				for (var down = lastSharedPathCompIndex + 1; down < globalPath.components.length; ++down)
					newPathComps.push(globalPath.components[down]);

				var relativePath = new Path$1(newPathComps, true);
				return relativePath;
			}
			CompactPathString(otherPath){
				var globalPathStr = null;
				var relativePathStr = null;
				
				if (otherPath.isRelative) {
					relativePathStr = otherPath.componentsString;
					globalPathStr = this.path.PathByAppendingPath(otherPath).componentsString;
				} 
				else {
					var relativePath = this.ConvertPathToRelative(otherPath);
					relativePathStr = relativePath.componentsString;
					globalPathStr = otherPath.componentsString;
				}

				if (relativePathStr.Length < globalPathStr.Length) 
					return relativePathStr;
				else
					return globalPathStr;
			}	
			Copy(){
				throw "Not Implemented";
			}
			//SetCHild works slightly diferently in the js implementation. SInce we can't pass an objets property by reference, we instead pass the object and the property string.
			SetChild(obj, prop, value){
				if (obj[prop])
					obj[prop] = null;

				obj[prop] = value;

				if( obj[prop] )
					obj[prop].parent = this;
			}
		}

		class StringBuilder{
			constructor(str){
				str = (typeof str !== 'undefined') ? str.toString() : '';
				this._string = str;
			}
			get Length(){
				return this._string.length;
			}
			Append(str){
				this._string += str;
			}
			AppendLine(str){
				if (typeof str !== 'undefined') this.Append(str);
				this._string += "\n";
			}
			AppendFormat(format){
				//taken from http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
				var args = Array.prototype.slice.call(arguments, 1);
				return format.replace(/{(\d+)}/g, function(match, number){
					return typeof args[number] != 'undefined' ? args[number] : match;
				});
			}
			toString(){
				return this._string;
			}
		}

		class InkListItem{
			constructor(fullNameOrOriginName, itemName){
				if (itemName !== undefined){
					this.originName = fullNameOrOriginName;
					this.itemName = itemName;
				}
				else{
					var nameParts = fullNameOrOriginName.toString().split('.');
		            this.originName = nameParts[0];
		            this.itemName = nameParts[1];
				}
			}
			static Null(){
				return new InkListItem(null, null);
			}
			isNull(){
				return this.originName == null && this.itemName == null;
			}
			get fullName(){
				return ((this.originName !== null) ? this.originName : "?") + "." + this.itemName;
			}
			toString(){
				return this.fullname;
			}
			Equals(obj){
				if (obj instanceof InkListItem) {
		//			var otherItem = (InkListItem)obj;
					var otherItem = obj;
					return otherItem.itemName   == this.itemName 
						&& otherItem.originName == this.originName;
				}

				return false;
			}
			//GetHashCode not implemented
			toString(){
				//WARNING: experimental. InkListItem are structs and are used as keys inside hashes. In js, we can't use an object as a key, as the key needs to be a string. C# gets around that with the internal GetHashCode, and the js equivalent to that is toString. So here, toString acts as C#'s GetHashCode
				var originCode = '0';
				var itemCode = (this.itemName) ? this.itemName.toString() : 'null';
				if (this.originName != null)
					originCode = this.originName.toString();
				
				return originCode + itemCode;
			}
		}

		//in C#, rawlists are based on dictionnary; the equivalent of a dictionnary in js is Object, but we can't use that or it will conflate dictionnary items and InkList class properties.
		//instead InkList-js has a special _values property wich contains the actual "Dictionnary", and a few Dictionnary methods are re-implemented on InkList. This also means directly iterating over the InkList won't work as expected. Maybe we can return a proxy if that's required.
		//@TODO: actually we could use a Map for this.
		class InkList {
			constructor(polymorphicArgument, originStory){
				this._keys = {};
				this._values = {};
				this.origins = null;
				this._originNames = null;
				
				//polymorphioc constructor
				if (polymorphicArgument){
					if (polymorphicArgument instanceof InkList){
						var otherList = polymorphicArgument;
						otherList.forEach((kv)=>{
							this.Add(kv.Key, kv.Value);
						});
						
						this._originNames = otherList._originNames;
					}
					else if (typeof polymorphicArgument === 'string'){
						this.SetInitialOriginName(polymorphicArgument);
						
						var def = null;
						if (def = originStory.listDefinitions.TryGetDefinition(polymorphicArgument, def)){
							this.origins = [def];
						}
						else{
							throw new Error("InkList origin could not be found in story when constructing new list: " + singleOriginListName);
						}
					}
					else if (polymorphicArgument.hasOwnProperty('Key') && polymorphicArgument.hasOwnProperty('Value')){
						var singleElement = polymorphicArgument;
						this.Add(singleElement.Key, singleElement.Value);
					}
				}
			}
			forEach(fn){
				for (var key in this._values){
					fn({
						Key: this._keys[key],
						Value: this._values[key]
					});
				}
			}
			AddItem(itemOrItemName){
				if (itemOrItemName instanceof InkListItem){
					var item = itemOrItemName;
					
					if (item.originName == null) {
							this.AddItem(item.itemName);
							return;
					}

					this.origins.forEach((origin)=>{
						if (origin.name == item.originName) {
								var intVal;
								intVal = origin.TryGetValueForItem(item, intVal);
								if (intVal !== undefined) {
										this.Add(item, intVal);
										return;
								} else {
										throw "Could not add the item " + item + " to this list because it doesn't exist in the original list definition in ink.";
								}
						}
					});

					throw "Failed to add item to list because the item was from a new list definition that wasn't previously known to this list. Only items from previously known lists can be used, so that the int value can be found.";
				}
				else{
					var itemName = itemOrItemName;
					
					var foundListDef = null;

					this.origins.forEach((origin)=>{
						if (origin.ContainsItemWithName(itemName)) {
								if (foundListDef != null) {
										throw "Could not add the item " + itemName + " to this list because it could come from either " + origin.name + " or " + foundListDef.name;
								} else {
										foundListDef = origin;
								}
						}
					});

					if (foundListDef == null)
							throw "Could not add the item " + itemName + " to this list because it isn't known to any list definitions previously associated with this list.";

					var item = new InkListItem(foundListDef.name, itemName);
					var itemVal = foundListDef.ValueForItem(item);
					this.Add(item, itemVal);
				}
			}
			ContainsItemNamed(itemName){
				var contains = false;
				this.forEach(itemWithValue => {
						if (itemWithValue.Key.itemName == itemName) contains = true;
				});
				return contains;
			}
			ContainsKey(key){
				return key in this._values;
			}
			Add(key, value){
				this._keys[key] = key;
				this._values[key] = value;
			}
			Remove(key){
				delete this._values[key];
				delete this._keys[key];
			}
			get Count(){
				return Object.keys(this._values).length;
			}
			get originOfMaxItem(){
				if (this.origins == null) return null;

				var maxOriginName = this.maxItem.Key.originName;
				var result = null;
				this.origins.every(function(origin){
					if (origin.name == maxOriginName){
						result = origin;
						return false;
					}
					else return true;
				});
				
				return result;
			}
			get originNames(){
				if (this.Count > 0) {
					if (this._originNames == null && this.Count > 0)
						this._originNames = [];
					else
						this._originNames.length = 0;

					this.forEach((itemAndValue)=>{
						this._originNames.push(itemAndValue.Key.originName);
					});
				}

				return this._originNames;
			}
			SetInitialOriginName(initialOriginName){
				this._originNames = [initialOriginName];
			}
			SetInitialOriginNames(initialOriginNames){
				if (initialOriginNames == null)
						this._originNames = null;
				else
						this._originNames = initialOriginNames.slice();//store a copy
			}
			get maxItem(){
				var max = {
					Key: null,
					Value: null
				};
				this.forEach(function(kv){
					if (max.Key === null || kv.Value > max.Value)
						max = kv;
				});
				
				return max;
			}
			get minItem(){
				var min = {
					Key: null,
					Value: null
				};
				this.forEach(function(kv){
					if (min.Key === null || kv.Value < min.Value)
						min = kv;
				});
				
				return min;
			}
			get inverse(){
				var list = new InkList();
				if (this.origins != null) {
					this.origins.forEach((origin)=>{
						origin.items.forEach((itemAndValue)=>{
							if (!this.ContainsKey(itemAndValue.Key))
								list.Add(itemAndValue.Key, itemAndValue.Value);
						});
					});
				}
				return list;
			}
			get all(){
				var list = new InkList();
				if (this.origins != null) {
					this.origins.forEach(function(origin){
						origin.items.forEach(function(itemAndValue){
							list.Add(itemAndValue.Key, itemAndValue.Value);
						});
					});
				}
				return list;
			}
			Union(otherList){
				var union = new InkList(this);
				otherList.forEach(function(kv){
					union.Add(kv.Key, kv.Value);
				});
				return union;
			}
			Intersect(otherList){
				var intersection = new InkList();
				this.forEach(function(kv){
					if (otherList.ContainsKey(kv.Key))
						intersection.Add(kv.Key, kv.Value);
				});
				return intersection;
			}
			Without(listToRemove){
				var result = new InkList(this);
				listToRemove.forEach(function(kv){
					result.Remove(kv.Key);
				});
				return result;
			}
			Contains(otherList){
				var contains = true;
				otherList.forEach((kv)=>{
					if (!this.ContainsKey(kv.Key)) contains = false;
				});
				return contains;
			}
			GreaterThan(otherList){
				if (this.Count == 0) return false;
				if (otherList.Count == 0) return true;

				// All greater
				return this.minItem.Value > otherList.maxItem.Value;
			}
			GreaterThanOrEquals(otherList){
				if (this.Count == 0) return false;
				if (otherList.Count == 0) return true;

				return this.minItem.Value >= otherList.minItem.Value
					&& this.maxItem.Value >= otherList.maxItem.Value;
			}
			LessThan(otherList){
				if (otherList.Count == 0) return false;
				if (this.Count == 0) return true;

				return this.maxItem.Value < otherList.minItem.Value;
			}
			LessThanOrEquals(otherList){
				if (otherList.Count == 0) return false;
				if (this.Count == 0) return true;

				return this.maxItem.Value <= otherList.maxItem.Value
					&& this.minItem.Value <= otherList.minItem.Value;
			}
			MaxAsList(){
				if (this.Count > 0)
					return new InkList(this.maxItem);
				else
					return new InkList();
			}
			MinAsList(){
				if (this.Count > 0)
					return new InkList(this.minItem);
				else
					return new InkList();
			}
			Equals(other){
		//		var otherInkList = other as InkList;
				var otherInkList = other;
				if (otherInkList instanceof InkList === false) return false;
				if (otherInkList.Count != this.Count) return false;

				var equals = true;
				this.forEach(function(kv){
					if (!otherInkList.ContainsKey(kv.Key))
						equals = false;
				});

				return equals;
			}
			//GetHashCode not implemented
			toString(){
				var ordered = [];
				this.forEach(function(kv){
					ordered.push(kv);
				});
				ordered = ordered.sort((a, b) => {
					return (a.Value === b.Value) ? 0 : ((a.Value > b.Value) ? 1 : -1);
				});

				var sb = new StringBuilder();
				for (var i = 0; i < ordered.length; i++) {
					if (i > 0)
						sb.Append(", ");

					var item = ordered[i].Key;
					sb.Append(item.itemName);
				}

				return sb.toString();
			}
			//casting a InkList to a Number, for somereason, actually gives a number. This messes up the type detection when creating a Value from a InkList. Returning NaN here prevents that.
			valueOf(){
				return NaN;
			}
		}

		var ValueType = {
			// Used in coersion
			Int: 0,
			Float: 1,
			List: 2,
			String: 3,

			// Not used for coersion described above
			DivertTarget: 4,
			VariablePointer: 5
		};

		class AbstractValue extends Object$1{
			constructor(val){
				super();
				this._valueType;
				this._isTruthy;
				this._valueObject;
			}
			get valueType(){
				return this._valueType;
			}
			get isTruthy(){
				return this._isTruthy;
			}
			get valueObject(){
				return this._valueObject;
			}
			
			Cast(newType){
				throw "Trying to casting an AbstractValue";
			}
			static Create(val){
				// Implicitly convert bools into ints
				if (typeof val === 'boolean'){
					var b = !!val;
					val = (b) ? 1 : 0;
				}

				if (Number.isInteger(Number(val))) {
					return new IntValue(val);
				} else if (!isNaN(val)) {
					return new FloatValue(val);
				} else if (typeof val === 'string') {
					return new StringValue(val);
				} else if (val instanceof Path$1) {
					return new DivertTargetValue(val);
				} else if (val instanceof InkList) {
					return new ListValue(val);
				}
			
				return null;
			}
			Copy(val){
				return AbstractValue.Create(val);
			}
		}

		class Value extends AbstractValue{
			constructor(val){
				super();
				this.value = val;
			}
			get value(){
				return this._value;
			}
			set value(value){
				this._value = value;
			}
			get valueObject(){
				return this.value;
			}
			toString(){
				return this.value.toString();
			}
		}

		class IntValue extends Value{
			constructor(val){
				super(val || 0);
				this._valueType = ValueType.Int;
			}
			get isTruthy(){
				return this.value != 0;
			}
			get valueType(){
				return ValueType.Int;
			}
			
			Cast(newType){
				if (newType == this.valueType) {
					return this;
				}

				if (newType == ValueType.Float) {
					return new FloatValue(parseFloat(this.value));
				}

				if (newType == ValueType.String) {
					return new StringValue("" + this.value);
				}

				throw "Unexpected type cast of Value to new ValueType";
			}
		}

		class FloatValue extends Value{
			constructor(val){
				super(val || 0.0);
				this._valueType = ValueType.Float;
			}
			get isTruthy(){
				return this._value != 0.0;
			}
			get valueType(){
				return ValueType.Float;
			}
			
			Cast(newType){
				if (newType == this.valueType) {
					return this;
				}

				if (newType == ValueType.Int) {
					return new IntValue(parseInt(this.value));
				}

				if (newType == ValueType.String) {
					return new StringValue("" + this.value);
				}

				throw "Unexpected type cast of Value to new ValueType";
			}
		}

		class StringValue extends Value{
			constructor(val){
				super(val || '');
				this._valueType = ValueType.String;
				
				this._isNewline = (this.value == "\n");
				this._isInlineWhitespace = true;
				
				this.value.split().every(c => {
					if (c != ' ' && c != '\t'){
						this._isInlineWhitespace = false;
						return false;
					}
					
					return true;
				});
			}
			get valueType(){
				return ValueType.String;
			}
			get isTruthy(){
				return this.value.length > 0;
			}
			get isNewline(){
				return this._isNewline;
			}
			get isInlineWhitespace(){
				return this._isInlineWhitespace;
			}
			get isNonWhitespace(){
				return !this.isNewline && !this.isInlineWhitespace;
			}
			
			Cast(newType){
				if (newType == this.valueType) {
					return this;
				}

				if (newType == ValueType.Int) {

					var parsedInt;
					if (parsedInt = parseInt(value)) {
						return new IntValue(parsedInt);
					} else {
						return null;
					}
				}

				if (newType == ValueType.Float) {
					var parsedFloat;
					if (parsedFloat = parsedFloat(value)) {
						return new FloatValue(parsedFloat);
					} else {
						return null;
					}
				}

				throw "Unexpected type cast of Value to new ValueType";
			}
		}

		class DivertTargetValue extends Value{
			constructor(targetPath){
				super(targetPath);
				
				this._valueType = ValueType.DivertTarget;
			}
			get targetPath(){
				return this.value;
			}
			set targetPath(value){
				this.value = value;
			}
			get isTruthy(){
				throw "Shouldn't be checking the truthiness of a divert target";
			}
			
			Cast(newType){
				if (newType == this.valueType)
					return this;

				throw "Unexpected type cast of Value to new ValueType";
			}
			toString(){
				return "DivertTargetValue(" + this.targetPath + ")";
			}
		}

		class VariablePointerValue extends Value{
			constructor(variableName, contextIndex){
				super(variableName);
				
				this._valueType = ValueType.VariablePointer;
				this.contextIndex = (typeof contextIndex !== 'undefined') ? contextIndex : -1;
			}
			get variableName(){
				return this.value;
			}
			set variableName(value){
				this.value = value;
			}
			get isTruthy(){
				throw "Shouldn't be checking the truthiness of a variable pointer";
			}
			
			Cast(newType){
				if (newType == this.valueType)
					return this;

				throw "Unexpected type cast of Value to new ValueType";
			}
			toString(){
				return "VariablePointerValue(" + this.variableName + ")";
			}
			Copy(){
				return new VariablePointerValue(this.variableName, this.contextIndex);
			}
		}

		class ListValue extends Value{
			get valueType(){
				return ValueType.List;
			}
			get isTruthy(){
				var isTruthy = false;
				this.value.forEach(function(kv){
					var listItemIntValue = kv.Value;
					if (listItemIntValue != 0)
						isTruthy = true; 
				});
				return isTruthy;
			}
			Cast(newType){
				 if (newType == ValueType.Int) {
					var max = this.value.maxItem;
					if( max.Key.isNull )
						return new IntValue(0);
					else
						return new IntValue(max.Value);
				}

				else if (newType == ValueType.Float) {
					var max = this.value.maxItem;
					if (max.Key.isNull)
						return new FloatValue(0.0);
					else
						return new FloatValue(parseFloat(max.Value));
				}

				else if (newType == ValueType.String) {
					var max = value.maxItem;
					if (max.Key.isNull)
						return new StringValue("");
					else {
						return new StringValue(max.Key.toString());
					}
				}

				if (newType == this.valueType)
					return this;

				throw "Unexpected type cast of Value to new ValueType";
			}
			constructor(listOrSingleItem, singleValue){
				super(null);
				
				this._valueType = ValueType.List;
				
				if (listOrSingleItem instanceof InkList){
					this.value = new InkList(listOrSingleItem);
				}
				else if (listOrSingleItem !== undefined && singleValue !== undefined){
					this.value = new InkList({
						Key: listOrSingleItem,
						Value: singleValue
					});
				}
				else{
					this.value = new InkList();
				}
			}
			static RetainListOriginsForAssignment(oldValue, newValue){
		//		var oldList = oldValue as ListValue;
				var oldList = oldValue;
		//		var newList = newValue as ListValue;
				var newList = newValue;

				// When assigning the emtpy list, try to retain any initial origin names
				if (oldList instanceof ListValue && newList instanceof ListValue && newList.value.Count == 0)
					newList.value.SetInitialOriginNames(oldList.value.originNames);
			}
		}

		class StoryException extends Error{
			constructor(message) {
				super(message);
				this.message = message;
				this.name = 'StoryException';
			}
		}

		class Container extends Object$1{//also implements INamedContent. Not sure how to do it cleanly in JS.
			constructor(){
				super();
				this.name = '';
				
				this._content = [];
				this.namedContent = {};
				
				this.visitsShouldBeCounted = false;
				this.turnIndexShouldBeCounted = false;
				this.countingAtStartOnly = false;
				
				this.CountFlags = {
					Visits: 1,
					Turns: 2,
					CountStartOnly: 4
				};
				
				this._pathToFirstLeafContent = null;
			}
			get hasValidName(){
				return this.name != null && this.name.length > 0;
			}
			get content(){
				return this._content;
			}
			set content(value){
				this.AddContent(value);
			}
			get namedOnlyContent(){
				var namedOnlyContentDict = {};
				
				for (var key in this.namedContent){
					namedOnlyContentDict[key] = this.namedContent[key];
				}

				this.content.forEach(c => {
		//			var named = c as INamedContent;
					var named = c;
					if (named.name && named.hasValidName) {
						delete namedOnlyContentDict[named.name];
					}
				});

				if (Object.keys(namedOnlyContentDict).length == 0)
					namedOnlyContentDict = null;

				return namedOnlyContentDict;
			}
			set namedOnlyContent(value){
				var existingNamedOnly = this.namedOnlyContent;
				if (existingNamedOnly != null) {
					for (var key in existingNamedOnly){
						delete this.namedContent[key];
					}
				}

				if (value == null)
					return;

				for (var key in value){
		//			var named = kvPair.Value as INamedContent;
					var named = value[key];
					if( named.name && typeof named.hasValidName !== 'undefined' )
						this.AddToNamedContentOnly(named);
				}
			}
			get countFlags(){
				var flags = 0;
				if (this.visitsShouldBeCounted)    flags |= this.CountFlags.Visits;
				if (this.turnIndexShouldBeCounted) flags |= this.CountFlags.Turns;
				if (this.countingAtStartOnly)      flags |= this.CountFlags.CountStartOnly;

				// If we're only storing CountStartOnly, it serves no purpose,
				// since it's dependent on the other two to be used at all.
				// (e.g. for setting the fact that *if* a gather or choice's
				// content is counted, then is should only be counter at the start)
				// So this is just an optimisation for storage.
				if (flags == this.CountFlags.CountStartOnly) {
					flags = 0;
				}

				return flags;
			}
			set countFlags(value){
				 var flag = value;
				if ((flag & this.CountFlags.Visits) > 0) this.visitsShouldBeCounted = true;
				if ((flag & this.CountFlags.Turns) > 0)  this.turnIndexShouldBeCounted = true;
				if ((flag & this.CountFlags.CountStartOnly) > 0) this.countingAtStartOnly = true;
			}
			get pathToFirstLeafContent(){
				if( this._pathToFirstLeafContent == null )
					this._pathToFirstLeafContent = this.path.PathByAppendingPath(this.internalPathToFirstLeafContent);

				return this._pathToFirstLeafContent;
			}
			get internalPathToFirstLeafContent(){
				var path = new Path ();
				var container = this;
				while (container instanceof Container) {
					if (container.content.length > 0) {
						path.components.push(new Path.Component(0));
		//				container = container.content [0] as Container;
						container = container.content[0];
					}
				}
				return path;
			}
			
			AddContent(contentObj){
				if (contentObj instanceof Array){
					contentObj.forEach(c => {
						this.AddContent(c);
					});
				}
				else{
					this._content.push(contentObj);
					
					if (contentObj.parent) {
		                throw "content is already in " + contentObj.parent;
		            }
					
					contentObj.parent = this;

					this.TryAddNamedContent(contentObj);
				}
			}
			TryAddNamedContent(contentObj){
				//so here, in the reference implementation, contentObj is casted to an INamedContent
				//but here we use js-style duck typing: if it implements the same props as the interface, we treat it as valid
				if (contentObj.hasValidName && contentObj.name){
					this.AddToNamedContentOnly(contentObj);
				}
			}
			AddToNamedContentOnly(namedContentObj){
				if (namedContentObj instanceof Object$1 === false) console.warn("Can only add Runtime.Objects to a Runtime.Container");
				namedContentObj.parent = this;

				this.namedContent[namedContentObj.name] = namedContentObj;
			}
			ContentAtPath(path, partialPathLength){
				partialPathLength = (typeof partialPathLength !== 'undefined') ? partialPathLength : path.components.length;

				var currentContainer = this;
				var currentObj = this;

				for (var i = 0; i < partialPathLength; ++i) {
					var comp = path.components[i];
					if (!(currentContainer instanceof Container))
						throw "Path continued, but previous object wasn't a container: " + currentObj;
					
					currentObj = currentContainer.ContentWithPathComponent(comp);
		//			currentContainer = currentObj as Container;
					currentContainer = currentObj;
				}

				return currentObj;
			}
			InsertContent(contentObj, index){
				this.content[i] = contentObj;

				if (contentObj.parent) {
					throw "content is already in " + contentObj.parent;
				}

				contentObj.parent = this;

				this.TryAddNamedContent(contentObj);
			}
			AddContentsOfContainer(otherContainer){
				this.content = this.content.concat(otherContainer.content);
				
				otherContainer.content.forEach(obj => {
					obj.parent = this;
					this.TryAddNamedContent(obj);
				});
			}
			ContentWithPathComponent(component){
				if (component.isIndex) {

					if (component.index >= 0 && component.index < this.content.length) {
						return this.content[component.index];
					}

					// When path is out of range, quietly return nil
					// (useful as we step/increment forwards through content)
					else {
						return null;
					}

				} 

				else if (component.isParent) {
					return this.parent;
				}

				else {
					var foundContent = null;
					if (foundContent = this.namedContent[component.name]){
						return foundContent;
					}
					else {
						throw new StoryException("Content '"+component.name+"' not found at path: '"+this.path+"'");
					}
				}
			}
			BuildStringOfHierarchy(sb, indentation, pointedObj){
				if (arguments.length == 0){
					var sb = new StringBuilder();
					this.BuildStringOfHierarchy(sb, 0, null);
					return sb.toString();
				}
				
				function appendIndentation(){
					var spacesPerIndent = 4;
					for(var i = 0; i < spacesPerIndent*indentation; ++i) { 
						sb.Append(" "); 
					}
				}

				appendIndentation();
				sb.Append("[");

				if (this.hasValidName) {
					sb.AppendFormat(" ({0})", this.name);
				}

				if (this == pointedObj) {
					sb.Append("  <---");
				}

				sb.AppendLine();

				indentation++;

				for (var i = 0; i < this.content.length; ++i) {

					var obj = this.content[i];

					if (obj instanceof Container) {

						var container = obj;

						container.BuildStringOfHierarchy(sb, indentation, pointedObj);

					} else {
						appendIndentation();
						if (obj instanceof StringValue) {
							sb.Append("\"");
							sb.Append(obj.toString().replace("\n", "\\n"));
							sb.Append("\"");
						} else {
							sb.Append(obj.toString());
						}
					}

					if (i != this.content.length - 1) {
						sb.Append(",");
					}

					if ( !(obj instanceof Container) && obj == pointedObj ) {
						sb.Append("  <---");
					}

					sb.AppendLine();
				}


				var onlyNamed = {};
				
				for (var key in this.namedContent){
					if (this.content.indexOf(this.namedContent[key]) >= 0) {
						continue;
					} else {
						onlyNamed[key] = this.namedContent[key];
					}
				}

				if (Object.keys(onlyNamed).length > 0) {
					appendIndentation();
					sb.AppendLine("-- named: --");

					for (var key in onlyNamed){
						if (!(onlyNamed[key] instanceof Container)) console.warn("Can only print out named Containers");
						
						var container = onlyNamed[key];
						container.BuildStringOfHierarchy(sb, indentation, pointedObj);
						sb.Append("\n");
					}
				}


				indentation--;

				appendIndentation();
				sb.Append("]");
			}
		}

		class Glue extends Object$1{
			constructor(type){
				super();
				this.glueType = type;
			}
			get isLeft(){
				return this.glueType == GlueType.Left;
			}
			get isBi(){
				return this.glueType == GlueType.Bidirectional;
			}
			get isRight(){
				return this.glueType == GlueType.Right;
			}
			toString(){
				switch (this.glueType) {
				case GlueType.Bidirectional: return "BidirGlue";
				case GlueType.Left: return "LeftGlue";
				case GlueType.Right: return "RightGlue";
				}
				
				return "UnexpectedGlueType";
			}
		}

		let GlueType = {
			Bidirectional: 0,
			Left: 1,
		    Right: 2
		};

		class ControlCommand extends Object$1{
			constructor(commandType){
				super();
				this._commandType = (typeof commandType != 'undefined') ? commandType : CommandType.NotSet;
			}
			get commandType(){
				return this._commandType;
			}
			copy(){
				return new ControlCommand(this.commandType);
			}
			toString(){
				return this.commandType.toString();
			}
			static EvalStart(){
				return new ControlCommand(CommandType.EvalStart);
			}
			static EvalOutput(){
				return new ControlCommand(CommandType.EvalOutput);
			}
			static EvalEnd(){
				return new ControlCommand(CommandType.EvalEnd);
			}
			static Duplicate(){
				return new ControlCommand(CommandType.Duplicate);
			}
			static PopEvaluatedValue(){
				return new ControlCommand(CommandType.PopEvaluatedValue);
			}
			static PopFunction(){
				return new ControlCommand(CommandType.PopFunction);
			}
			static PopTunnel(){
				return new ControlCommand(CommandType.PopTunnel);
			}
			static BeginString(){
				return new ControlCommand(CommandType.BeginString);
			}
			static EndString(){
				return new ControlCommand(CommandType.EndString);
			}
			static NoOp(){
				return new ControlCommand(CommandType.NoOp);
			}
			static ChoiceCount(){
				return new ControlCommand(CommandType.ChoiceCount);
			}
			static TurnsSince(){
				return new ControlCommand(CommandType.TurnsSince);
			}
			static ReadCount(){
				return new ControlCommand(CommandType.ReadCount);
			}
			static Random(){
				return new ControlCommand(CommandType.Random);
			}
			static SeedRandom(){
				return new ControlCommand(CommandType.SeedRandom);
			}
			static VisitIndex(){
				return new ControlCommand(CommandType.VisitIndex);
			}
			static SequenceShuffleIndex(){
				return new ControlCommand(CommandType.SequenceShuffleIndex);
			}
			static StartThread(){
				return new ControlCommand(CommandType.StartThread);
			}
			static Done(){
				return new ControlCommand(CommandType.Done);
			}
			static End(){
				return new ControlCommand(CommandType.End);
			}
			static ListFromInt(){
				return new ControlCommand(CommandType.ListFromInt);
			}
			static ListRange(){
				return new ControlCommand(CommandType.ListRange);
			}
		}

		var CommandType = {
			NotSet: -1,
			EvalStart: 0,
			EvalOutput: 1,
			EvalEnd: 2,
			Duplicate: 3,
			PopEvaluatedValue: 4,
			PopFunction: 5,
			PopTunnel: 6,
			BeginString: 7,
			EndString: 8,
			NoOp: 9,
			ChoiceCount: 10,
			TurnsSince: 11,
			Random: 12,
			SeedRandom: 13,
			VisitIndex: 14,
			SequenceShuffleIndex: 15,
			StartThread: 16,
			Done: 17,
			End: 18,
			ListFromInt: 19,
			ListRange: 20,
			ReadCount: 21
		};
		CommandType.TOTAL_VALUES = Object.keys(CommandType).length - 1;//-1 because NotSet shoudn't count
		ControlCommand.CommandType = CommandType;

		let PushPopType = {
			Tunnel: 0,
			Function: 1,
		};

		class Divert extends Object$1{
			constructor(stackPushType){
				super();
				this._targetPath;
				this._targetContent;
				
				this.variableDivertName;
				this.pushesToStack;
				this.stackPushType;
				
				this.isExternal;
				this.isConditional;
				this.externalArgs;
				
				//actual constructor
				this.pushesToStack = false;
				if (stackPushType){
					this.pushesToStack = true;
					this.stackPushType = stackPushType;
				}
			}
			get targetPath(){
				// Resolve any relative paths to global ones as we come across them
				if (this._targetPath != null && this._targetPath.isRelative) {
					var targetObj = this.targetContent;
					if (targetObj) {
						this._targetPath = targetObj.path;
					}
				}
				
				return this._targetPath;
			}
			set targetPath(value){
				this._targetPath = value;
				this._targetContent = null;
			}
			get targetContent(){
				if (this._targetContent == null) {
					this._targetContent = this.ResolvePath(this._targetPath);
				}

				return this._targetContent;
			}
			get targetPathString(){
				if (this.targetPath == null)
					return null;

				return this.CompactPathString(this.targetPath);
			}
			set targetPathString(value){
				if (value == null) {
					this.targetPath = null;
				} else {
					this.targetPath = new Path$1(value);
				}
			}
			get hasVariableTarget(){
				return this.variableDivertName != null;
			}
			
			Equals(obj){
		//		var otherDivert = obj as Divert;
				var otherDivert = obj;
				if (otherDivert instanceof Divert) {
					if (this.hasVariableTarget == otherDivert.hasVariableTarget) {
						if (this.hasVariableTarget) {
							return this.variableDivertName == otherDivert.variableDivertName;
						} else {
							return this.targetPath.Equals(otherDivert.targetPath);
						}
					}
				}
				return false;
			}
			toString(){
				if (this.hasVariableTarget) {
					return "Divert(variable: " + this.variableDivertName + ")";
				}
				else if (this.targetPath == null) {
					return "Divert(null)";
				} else {

					var sb = new StringBuilder;

					var targetStr = this.targetPath.toString();
		//			int? targetLineNum = DebugLineNumberOfPath (targetPath);
					var targetLineNum = null;
					if (targetLineNum != null) {
						targetStr = "line " + targetLineNum;
					}

					sb.Append("Divert");
					if (this.pushesToStack) {
						if (this.stackPushType == PushPopType.Function) {
							sb.Append(" function");
						} else {
							sb.Append(" tunnel");
						}
					}

					sb.Append(" (");
					sb.Append(targetStr);
					sb.Append(")");

					return sb.toString();
				}
			}
		}

		class ChoicePoint extends Object$1{
			constructor(onceOnly){
				super();
				this._pathOnChoice;
				this.hasCondition;
				this.hasStartContent;
				this.hasChoiceOnlyContent;
				this.onceOnly;
				this.isInvisibleDefault;
				
				this.onceOnly = !!onceOnly;
			}
			get pathOnChoice(){
				if (this._pathOnChoice != null && this._pathOnChoice.isRelative) {
					var choiceTargetObj = this.choiceTarget;
					if (choiceTargetObj) {
						this._pathOnChoice = choiceTargetObj.path;
					}
				}
				return this._pathOnChoice;
			}
			get choiceTarget(){
				//return this.ResolvePath (_pathOnChoice) as Container;
				return this.ResolvePath(this._pathOnChoice);
			}
			get pathStringOnChoice(){
				return this.CompactPathString(this.pathOnChoice);
			}
			set pathStringOnChoice(value){
				this.pathOnChoice = new Path$1(value);
			}
			get flags(){
				var flags = 0;
				if (this.hasCondition)         flags |= 1;
				if (this.hasStartContent)      flags |= 2;
				if (this.hasChoiceOnlyContent) flags |= 4;
				if (this.isInvisibleDefault)   flags |= 8;
				if (this.onceOnly)             flags |= 16;
				return flags;
			}
			set flags(value){
				this.hasCondition = (value & 1) > 0;
				this.hasStartContent = (value & 2) > 0;
				this.hasChoiceOnlyContent = (value & 4) > 0;
				this.isInvisibleDefault = (value & 8) > 0;
				this.onceOnly = (value & 16) > 0;
			}
			set pathOnChoice(value){
				this._pathOnChoice = value;
			}
			
			toString(){
		//		int? targetLineNum = DebugLineNumberOfPath (pathOnChoice);
				var targetLineNum = null;
				var targetString = this.pathOnChoice.toString();

				if (targetLineNum != null) {
					targetString = " line " + targetLineNum;
				} 

				return "Choice: -> " + targetString;
			}
		}

		class VariableReference extends Object$1{
			constructor(name){
				super();
				this.name = name;
				this.pathForCount;
			}
			get containerForCount(){
				return this.ResolvePath(this.pathForCount);
			}
			get pathStringForCount(){
				if( this.pathForCount == null )
					return null;

				return this.CompactPathString(this.pathForCount);
			}
			set pathStringForCount(value){
				if (value == null)
					this.pathForCount = null;
				else
					this.pathForCount = new Path$1(value);
			}
			
			toString(){
				if (this.name != null) {
					return "var(" + this.name + ")";
				} else {
					var pathStr = this.pathStringForCount;
					return "read_count(" + pathStr + ")";
				}
			}
		}

		class VariableAssignment extends Object$1{
			constructor(variableName, isNewDeclaration){
				super();
				this._variableName = variableName || null;
				this._isNewDeclaration = !!isNewDeclaration;
				this.isGlobal;
			}
			get variableName(){
				return this._variableName;
			}
			get isNewDeclaration(){
				return this._isNewDeclaration;
			}
			
			toString(){
				return "VarAssign to " + this.variableName;
			}
		}

		class Void extends Object$1{}

		//misses delegates, probably the returns from function calls
		class NativeFunctionCall extends Object$1{
			constructor(name){
				super();
				this.name = name;
				this._numberOfParameters;
				
				this._prototype;
				this._isPrototype;
				this._operationFuncs = null;	
				
				NativeFunctionCall.GenerateNativeFunctionsIfNecessary();
			}
			get name(){
				return this._name;
			}
			set name(value){
				this._name = value;
				if( !this._isPrototype )
					this._prototype = NativeFunctionCall._nativeFunctions[this._name];
			}
			get numberOfParameters(){
				if (this._prototype) {
					return this._prototype.numberOfParameters;
				} else {
					return this._numberOfParameters;
				}
			}
			set numberOfParameters(value){
				this._numberOfParameters = value;
			}
			
			static internalConstructor(name, numberOfParamters){
				var nativeFunc = new NativeFunctionCall(name);
				nativeFunc._isPrototype = true;
				nativeFunc.numberOfParameters = numberOfParamters;
				return nativeFunc;
			}
			static CallWithName(functionName){
				return new NativeFunctionCall(functionName);
			}
			static CallExistsWithName(functionName){
				this.GenerateNativeFunctionsIfNecessary();
				return this._nativeFunctions[functionName];
			}
			Call(parameters){
				if (this._prototype) {
					return this._prototype.Call(parameters);
				}

				if (this.numberOfParameters != parameters.length) {
					throw "Unexpected number of parameters";
				}
				
				var hasList  = false;
				parameters.forEach(p => {
					if (p instanceof Void) throw new StoryException("Attempting to perform operation on a void value. Did you forget to 'return' a value from a function you called here?");
					if (p instanceof ListValue)
						hasList = true;
				});
				
				if (parameters.length == 2 && hasList){
					return this.CallBinaryListOperation(parameters);
				}

				var coercedParams = this.CoerceValuesToSingleType(parameters);
				var coercedType = coercedParams[0].valueType;

				//Originally CallType gets a type parameter that is used to do some casting, but we can do without.
				if (coercedType == ValueType.Int) {
					return this.CallType(coercedParams);
				} else if (coercedType == ValueType.Float) {
					return this.CallType(coercedParams);
				} else if (coercedType == ValueType.String) {
					return this.CallType(coercedParams);
				} else if (coercedType == ValueType.DivertTarget) {
					return this.CallType(coercedParams);
				} else if (coercedType == ValueType.List) {
					return this.CallType(coercedParams);
				}

				return null;
			}
			CallType(parametersOfSingleType){
				var param1 = parametersOfSingleType[0];
				var valType = param1.valueType;

				var val1 = param1;

				var paramCount = parametersOfSingleType.length;

				if (paramCount == 2 || paramCount == 1) {

					var opForTypeObj = this._operationFuncs[valType];
					if (!opForTypeObj) {
						throw new StoryException("Cannot perform operation '"+this.name+"' on "+valType);
					}

					// Binary
					if (paramCount == 2) {
						var param2 = parametersOfSingleType[1];

						var val2 = param2;

						var opForType = opForTypeObj;

						// Return value unknown until it's evaluated
						var resultVal = opForType(val1.value, val2.value);

						return Value.Create(resultVal);
					} 

					// Unary
					else {

						var opForType = opForTypeObj;

						var resultVal = opForType(val1.value);

						return Value.Create(resultVal);
					}  
				}

				else {
					throw "Unexpected number of parameters to NativeFunctionCall: " + parametersOfSingleType.length;
				}
			}
			CallBinaryListOperation(parameters)
			{
				// List-Int addition/subtraction returns a List (e.g. "alpha" + 1 = "beta")
				if ((this.name == "+" || this.name == "-") && parameters[0] instanceof ListValue && parameters[1] instanceof IntValue)
					return this.CallListIncrementOperation(parameters);

		//		var v1 = parameters [0] as Value;
				var v1 = parameters[0];
		//		var v2 = parameters [1] as Value;
				var v2 = parameters[1];

				// And/or with any other type requires coerscion to bool (int)
				if ((this.name == "&&" || this.name == "||") && (v1.valueType != ValueType.List || v2.valueType != ValueType.List)) {
		//			var op = _operationFuncs [ValueType.Int] as BinaryOp<int>;
					var op = this._operationFuncs[ValueType.Int];
					var result = op(v1.isTruthy ? 1 : 0, v2.isTruthy ? 1 : 0);
					return new IntValue(result);
				}

				// Normal (list • list) operation
				if (v1.valueType == ValueType.List && v2.valueType == ValueType.List)
					return this.CallType([v1, v2]);

				throw new StoryException("Can not call use '" + this.name + "' operation on " + v1.valueType + " and " + v2.valueType);
			}
			CallListIncrementOperation(listIntParams)
			{
				var listVal = listIntParams[0];
				var intVal = listIntParams[1];


				var resultInkList = new InkList();

				listVal.value.forEach(listItemWithValue => {
					var listItem = listItemWithValue.Key;
					var listItemValue = listItemWithValue.Value;

					// Find + or - operation
					var intOp = this._operationFuncs[ValueType.Int];

					// Return value unknown until it's evaluated
					var targetInt = intOp(listItemValue, intVal.value);

					// Find this item's origin (linear search should be ok, should be short haha)
					var itemOrigin = null;
					listVal.value.origins.forEach(function(origin){
						if (origin.name == listItem.originName) {
							itemOrigin = origin;
							return false;
						}
					});
					if (itemOrigin != null) {
						var incrementedItem = itemOrigin.TryGetItemWithValue(targetInt);
						if (incrementedItem.exists)
							resultInkList.Add(incrementedItem.item, targetInt);
					}
				});

				return new ListValue(resultInkList);
			}
			CoerceValuesToSingleType(parametersIn){
				var valType = ValueType.Int;
				
				var specialCaseList = null;

				// Find out what the output type is
				// "higher level" types infect both so that binary operations
				// use the same type on both sides. e.g. binary operation of
				// int and float causes the int to be casted to a float.
				parametersIn.forEach(obj => {
					var val = obj;
					if (val.valueType > valType) {
						valType = val.valueType;
					}
					
					if (val.valueType == ValueType.List) {
		//				 specialCaseList = val as ListValue;
						 specialCaseList = val;
					}
				});

				// Coerce to this chosen type
				var parametersOut = [];
				
				if (valType == ValueType.List) {
					parametersIn.forEach(function(val){
						if (val.valueType == ValueType.List) {
							parametersOut.push(val);
						} else if (val.valueType == ValueType.Int) {
							var intVal = parseInt(val.valueObject);
							var list = specialCaseList.value.originOfMaxItem;

							var item = list.TryGetItemWithValue(intVal);
							if (item.exists) {
								var castedValue = new ListValue(item.item, intVal);
								parametersOut.push(castedValue);
							} else
								throw new StoryException("Could not find List item with the value " + intVal + " in " + list.name);
						} else
							throw new StoryException("Cannot mix Lists and " + val.valueType + " values in this operation");
					});
				} 

				// Normal Coercing (with standard casting)
				else {
					parametersIn.forEach(function(val){
						var castedValue = val.Cast(valType);
						parametersOut.push(castedValue);
					});
				}

				return parametersOut;
			}
			static GenerateNativeFunctionsIfNecessary(){
				if (this._nativeFunctions == null) {
					this._nativeFunctions = {};

					// Int operations
					this.AddIntBinaryOp(this.Add,      (x, y) => {return x + y});
					this.AddIntBinaryOp(this.Subtract, (x, y) => {return x - y});
					this.AddIntBinaryOp(this.Multiply, (x, y) => {return x * y});
					this.AddIntBinaryOp(this.Divide,   (x, y) => {return parseInt(x / y)});
					this.AddIntBinaryOp(this.Mod,      (x, y) => {return x % y}); 
					this.AddIntUnaryOp(this.Negate,   x => {return -x}); 

					this.AddIntBinaryOp(this.Equal,    (x, y) => {return x == y ? 1 : 0});
					this.AddIntBinaryOp(this.Greater,  (x, y) => {return x > y  ? 1 : 0});
					this.AddIntBinaryOp(this.Less,     (x, y) => {return x < y  ? 1 : 0});
					this.AddIntBinaryOp(this.GreaterThanOrEquals, (x, y) => {return x >= y ? 1 : 0});
					this.AddIntBinaryOp(this.LessThanOrEquals, (x, y) => {return x <= y ? 1 : 0});
					this.AddIntBinaryOp(this.NotEquals, (x, y) => {return x != y ? 1 : 0});
					this.AddIntUnaryOp(this.Not,       x => {return (x == 0) ? 1 : 0}); 

					this.AddIntBinaryOp(this.And,      (x, y) => {return x != 0 && y != 0 ? 1 : 0});
					this.AddIntBinaryOp(this.Or,       (x, y) => {return x != 0 || y != 0 ? 1 : 0});

					this.AddIntBinaryOp(this.Max,      (x, y) => {return Math.max(x, y)});
					this.AddIntBinaryOp(this.Min,      (x, y) => {return Math.min(x, y)});

					// Float operations
					this.AddFloatBinaryOp(this.Add,      (x, y) => {return x + y});
					this.AddFloatBinaryOp(this.Subtract, (x, y) => {return x - y});
					this.AddFloatBinaryOp(this.Multiply, (x, y) => {return x * y});
					this.AddFloatBinaryOp(this.Divide,   (x, y) => {return x / y});
					this.AddFloatBinaryOp(this.Mod,      (x, y) => {return x % y}); // TODO: Is this the operation we want for floats?
					this.AddFloatUnaryOp(this.Negate,   x => {return -x}); 

					this.AddFloatBinaryOp(this.Equal,    (x, y) => {return x == y ? 1 : 0});
					this.AddFloatBinaryOp(this.Greater,  (x, y) => {return x > y  ? 1 : 0});
					this.AddFloatBinaryOp(this.Less,     (x, y) => {return x < y  ? 1 : 0});
					this.AddFloatBinaryOp(this.GreaterThanOrEquals, (x, y) => {return x >= y ? 1 : 0});
					this.AddFloatBinaryOp(this.LessThanOrEquals, (x, y) => {return x <= y ? 1 : 0});
					this.AddFloatBinaryOp(this.NotEquals, (x, y) => {return x != y ? 1 : 0});
					this.AddFloatUnaryOp(this.Not,       x => {return (x == 0.0) ? 1 : 0}); 

					this.AddFloatBinaryOp(this.And,      (x, y) => {return x != 0.0 && y != 0.0 ? 1 : 0});
					this.AddFloatBinaryOp(this.Or,       (x, y) => {return x != 0.0 || y != 0.0 ? 1 : 0});

					this.AddFloatBinaryOp(this.Max,      (x, y) => {return Math.max(x, y)});
					this.AddFloatBinaryOp(this.Min,      (x, y) => {return Math.min(x, y)});

					// String operations
					this.AddStringBinaryOp(this.Add,     	(x, y) => {return x + y}); // concat
					this.AddStringBinaryOp(this.Equal,   	(x, y) => {return x === y ? 1 : 0});
					this.AddStringBinaryOp(this.NotEquals,(x, y) => {return !(x === y) ? 1 : 0});
					
					this.AddListBinaryOp(this.Add, 		 (x, y) => {return x.Union(y)});
					this.AddListBinaryOp(this.Subtract,  (x, y) => {return x.Without(y)});
					this.AddListBinaryOp(this.Has, 		 (x, y) => {return x.Contains(y) ? 1 : 0});
					this.AddListBinaryOp(this.Hasnt, 	 (x, y) => {return x.Contains(y) ? 0 : 1});
					this.AddListBinaryOp(this.Intersect, (x, y) => {return x.Intersect(y)});
					
					this.AddListBinaryOp(this.Equal, 				(x, y) => {return x.Equals(y) ? 1 : 0});
					this.AddListBinaryOp(this.Greater, 				(x, y) => {return x.GreaterThan(y) ? 1 : 0});
					this.AddListBinaryOp(this.Less, 				(x, y) => {return x.LessThan(y) ? 1 : 0});
					this.AddListBinaryOp(this.GreaterThanOrEquals, 	(x, y) => {return x.GreaterThanOrEquals(y) ? 1 : 0});
					this.AddListBinaryOp(this.LessThanOrEquals, 	(x, y) => {return x.LessThanOrEquals(y) ? 1 : 0});
					this.AddListBinaryOp(this.NotEquals, 			(x, y) => {return !x.Equals(y) ? 1 : 0});

					this.AddListBinaryOp (this.And, 				(x, y) => {return x.Count > 0 && y.Count > 0 ? 1 : 0});
		      this.AddListBinaryOp (this.Or,  				(x, y) => {return x.Count > 0 || y.Count > 0 ? 1 : 0});
					
					this.AddListUnaryOp(this.Not, (x) => {return x.Count == 0 ? 1 : 0});

					this.AddListUnaryOp(this.Invert, (x) => {return x.inverse});
					this.AddListUnaryOp(this.All, (x) => {return x.all});
					this.AddListUnaryOp(this.ListMin, (x) => {return x.MinAsList()});
					this.AddListUnaryOp(this.ListMax, (x) => {return x.MaxAsList()});
					this.AddListUnaryOp(this.Count,  (x) => {return x.Count});
					this.AddListUnaryOp(this.ValueOfList,  (x) => {return x.maxItem.Value});

					// Special case: The only operation you can do on divert target values
					var divertTargetsEqual = (d1, d2) => {
						return d1.Equals(d2) ? 1 : 0;
					};
					this.AddOpToNativeFunc(this.Equal, 2, ValueType.DivertTarget, divertTargetsEqual);
				}
			}
			AddOpFuncForType(valType, op){
				if (this._operationFuncs == null) {
					this._operationFuncs = {};
				}

				this._operationFuncs[valType] = op;
			}
			static AddOpToNativeFunc(name, args, valType, op){
				var nativeFunc = this._nativeFunctions[name];
				if (!nativeFunc) {
					nativeFunc = NativeFunctionCall.internalConstructor(name, args);
					this._nativeFunctions[name] = nativeFunc;
				}

				nativeFunc.AddOpFuncForType(valType, op);
			}
			
			static AddIntBinaryOp(name, op){
				this.AddOpToNativeFunc(name, 2, ValueType.Int, op);
			}
			static AddIntUnaryOp(name, op){
				this.AddOpToNativeFunc(name, 1, ValueType.Int, op);
			}
			
			static AddFloatBinaryOp(name, op){
				this.AddOpToNativeFunc(name, 2, ValueType.Float, op);
			}
			static AddFloatUnaryOp(name, op){
				this.AddOpToNativeFunc(name, 1, ValueType.Float, op);
			}
			
			static AddStringBinaryOp(name, op){
				this.AddOpToNativeFunc(name, 2, ValueType.String, op);
			}
			
			static AddListBinaryOp(name, op){
				this.AddOpToNativeFunc(name, 2, ValueType.List, op);
			}
			static AddListUnaryOp(name, op){
				this.AddOpToNativeFunc(name, 1, ValueType.List, op);
			}
			
			toString(){
				return "Native '" + this.name + "'";
			}
		}

		NativeFunctionCall.Add 		= "+";
		NativeFunctionCall.Subtract = "-";
		NativeFunctionCall.Divide   = "/";
		NativeFunctionCall.Multiply = "*";
		NativeFunctionCall.Mod      = "%";
		NativeFunctionCall.Negate   = "_";

		NativeFunctionCall.Equal    = "==";
		NativeFunctionCall.Greater  = ">";
		NativeFunctionCall.Less     = "<";
		NativeFunctionCall.GreaterThanOrEquals = ">=";
		NativeFunctionCall.LessThanOrEquals = "<=";
		NativeFunctionCall.NotEquals   = "!=";
		NativeFunctionCall.Not      = "!";

		NativeFunctionCall.And      = "&&";
		NativeFunctionCall.Or       = "||";

		NativeFunctionCall.Min      = "MIN";
		NativeFunctionCall.Max      = "MAX";

		NativeFunctionCall.Has      = "?";
		NativeFunctionCall.Hasnt    = "!?";
		NativeFunctionCall.Intersect = "^";

		NativeFunctionCall.ListMin   = "LIST_MIN";
		NativeFunctionCall.ListMax   = "LIST_MAX";
		NativeFunctionCall.All       = "LIST_ALL";
		NativeFunctionCall.Count     = "LIST_COUNT";
		NativeFunctionCall.ValueOfList = "LIST_VALUE";
		NativeFunctionCall.Invert    = "LIST_INVERT";

		NativeFunctionCall._nativeFunctions = null;

		class Tag extends Object$1{
			constructor(tagText){
				super();
				this._text = tagText.toString() || '';
			}
			get text(){
				return this._text;
			}
			toString(){
				return "# " + this._text;
			}
		}

		class Choice{
			constructor(choice){
				this.text;
				this.index;
				this.choicePoint;
				this.threadAtGeneration;
				
				this._originalThreadIndex;
				this._originalChoicePath;
				
				if (choice) this.choicePoint = choice;
			}
			get pathStringOnChoice(){
				return this.choicePoint.pathStringOnChoice;
			}
			get sourcePath(){
				return this.choicePoint.path.componentsString;
			}
		}

		class ListDefinition{
			constructor(name, items){
				this._name = name || '';
				this._items = null;
				this._rawListItemsKeys = null;
				this._itemNameToValues = items || {};
			}
			get name(){
				return this._name;
			}
			get items(){
				if (this._items == null){
					this._items = {};
					this._rawListItemsKeys = {};
					for (var key in this._itemNameToValues){
						var item = new InkListItem(this.name, key);
						this._rawListItemsKeys[item] = item;
						this._items[item] = this._itemNameToValues[key];
					}
				}
				this._items.forEach = this.forEachItems.bind(this);
				
				return this._items;
			}
			forEachItems(fn){
				for (var key in this._rawListItemsKeys){
					fn({
						Key: this._rawListItemsKeys[key],
						Value: this._items[key]
					});
				}
			}
			ValueForItem(item){
				var intVal = this._itemNameToValues[item.itemName];
				if (intVal !== undefined)
					return intVal;
				else
					return 0;
			}
			ContainsItem(item){
				if (item.originName != this.name) return false;

				return (item.itemName in this._itemNameToValues);
			}
			ContainsItemWithName(itemName){
				return this._itemNameToValues[itemName] !== undefined;
			}
			TryGetItemWithValue(val, item){//item was an out
				//the original function returns a boolean and has a second parameter called item that is an `out`. Both are needed and we can't just return the item because it'll always be truthy. Instead, we return an object containing the bool and the item
				for (var key in this._itemNameToValues){
					if (this._itemNameToValues[key] == val) {
						item = new InkListItem(this.name, key);
						return {
							item :item,
							exists: true
						};
					}
				}

				item = InkListItem.Null;
				return {
					item :item,
					exists: false
				};
			}
			TryGetValueForItem(item, intval){//intval is an out
				intVal = this._itemNameToValues[item.itemName];
				return intVal;
			}
			ListRange(min, max){
				var rawList = new InkList();
				for (var key in this._itemNameToValues){
					if (this._itemNameToValues[key] >= min && this._itemNameToValues[key] <= max) {
						var item = new InkListItem(this.name, key);
						rawList.Add(item, this._itemNameToValues[key]);
					}
				}
				return new ListValue(rawList);
			}
		}

		class ListDefinitionsOrigin{
			constructor(lists){
				this._lists = {};
				
				lists.forEach((list)=>{
					this._lists[list.name] = list;
				});
			}
			get lists(){
				var listOfLists = [];
				
				for (var key in this._lists){
					listOfLists.push(this._lists[key]);
				}
				return listOfLists;
			}
			TryGetDefinition(name, def){
				//initially, this function returns a boolean and the second parameter is an out.
				return (name in this._lists) ? this._lists[name] : def;
			}
			FindSingleItemListWithName(name){
				var item = InkListItem.Null;
				var list = null;

				var nameParts = name.split('.');
				if (nameParts.length == 2) {
					item = new InkListItem(nameParts[0], nameParts[1]);
					list = this.TryGetDefinition(item.originName, list);
				} else {
					for (var key in this._lists){
						var listWithItem = this._lists[key];
						item = new InkListItem(key, name);
						if (listWithItem.ContainsItem(item)) {
							list = listWithItem;
							break;
						}
					}
				}
				
				if (list != null) {
					var itemValue = list.ValueForItem(item);
					return new ListValue(item, itemValue);
				}

				return null;
			}
		}

		class JsonSerialisation{
			static ListToJArray(serialisables){
				var jArray = [];
				serialisables.forEach(s => {
					jArray.push(this.RuntimeObjectToJToken(s));
				});
				return jArray;
			}
			static JArrayToRuntimeObjList(jArray, skipLast){
				var count = jArray.length;
				if (skipLast) count--;
				
				var list = [];
				
				for (var i = 0; i < count; i++){
					var jTok = jArray[i];
					var runtimeObj = this.JTokenToRuntimeObject(jTok);
					list.push(runtimeObj);
				}
				
				return list;
			}
			static JObjectToDictionaryRuntimeObjs(jObject){
				var dict = {};

				for (var key in jObject){
					dict[key] = this.JTokenToRuntimeObject(jObject[key]);
				}

				return dict;
			}
			static DictionaryRuntimeObjsToJObject(dictionary){
				var jsonObj = {};

				for (var key in dictionary){
		//			var runtimeObj = keyVal.Value as Runtime.Object;
					var runtimeObj = dictionary[key];
					if (runtimeObj instanceof Object$1)
						jsonObj[key] = this.RuntimeObjectToJToken(runtimeObj);
				}

				return jsonObj;
			}
			static JObjectToIntDictionary(jObject){
				var dict = {};
				for (var key in jObject){
					dict[key] = parseInt(jObject[key]);
				}
				return dict;
			}
			static IntDictionaryToJObject(dict){
				var jObj = {};
				for (var key in dict){
					jObj[key] = dict[key];
				}
				return jObj;
			}
			static JTokenToRuntimeObject(token){
				//@TODO probably find a more robust way to detect numbers, isNaN seems happy to accept things that really aren't numberish.
				if (!isNaN(token) && token !== "\n"){//JS thinks "\n" is a number
					return Value.Create(token);
				}
				
				if (typeof token === 'string'){
					var str = token.toString();

					// String value
					var firstChar = str[0];
					if (firstChar == '^')
						return new StringValue(str.substring(1));
					else if(firstChar == "\n" && str.length == 1)
						return new StringValue("\n");

					// Glue
					if (str == "<>")
						return new Glue(GlueType.Bidirectional);
					else if(str == "G<")
						return new Glue(GlueType.Left);
					else if(str == "G>")
						return new Glue(GlueType.Right);

					// Control commands (would looking up in a hash set be faster?)
					for (var i = 0; i < _controlCommandNames.length; ++i) {
						var cmdName = _controlCommandNames[i];
						if (str == cmdName) {
							return new ControlCommand(i);
						}
					}

					// Native functions
					if (str == "L^") str = "^";
					if( NativeFunctionCall.CallExistsWithName(str) )
						return NativeFunctionCall.CallWithName(str);

					// Pop
					if (str == "->->")
						return ControlCommand.PopTunnel();
					else if (str == "~ret")
						return ControlCommand.PopFunction();

					// Void
					if (str == "void")
						return new Void ();
				}
				
				if (typeof token === 'object' && token instanceof Array === false){
					var obj = token;
					var propValue;

					// Divert target value to path
					if (obj["^->"]){
						propValue = obj["^->"];
						return new DivertTargetValue(new Path$1(propValue.toString()));
					}
						
					// VariablePointerValue
					if (obj["^var"]) {
						propValue = obj["^var"];
						var varPtr = new VariablePointerValue(propValue.toString());
						if (obj["ci"]){
							propValue = obj["ci"];
							varPtr.contextIndex = parseInt(propValue);
						}
						return varPtr;
					}

					// Divert
					var isDivert = false;
					var pushesToStack = false;
					var divPushType = PushPopType.Function;
					var external = false;
					if (propValue = obj["->"]) {
						isDivert = true;
					}
					else if (propValue = obj["f()"]) {
						isDivert = true;
						pushesToStack = true;
						divPushType = PushPopType.Function;
					}
					else if (propValue = obj["->t->"]) {
						isDivert = true;
						pushesToStack = true;
						divPushType = PushPopType.Tunnel;
					}
					else if (propValue = obj["x()"]) {
						isDivert = true;
						external = true;
						pushesToStack = false;
						divPushType = PushPopType.Function;
					}
					
					if (isDivert) {
						var divert = new Divert();
						divert.pushesToStack = pushesToStack;
						divert.stackPushType = divPushType;
						divert.isExternal = external;

						var target = propValue.toString();

						if (propValue = obj["var"])
							divert.variableDivertName = target;
						else
							divert.targetPathString = target;
						
						divert.isConditional = !!obj["c"];

						if (external) {
							if (propValue = obj["exArgs"])
								divert.externalArgs = parseInt(propValue);
						}

						return divert;
					}

					// Choice
					if (propValue = obj["*"]) {
						var choice = new ChoicePoint();
						choice.pathStringOnChoice = propValue.toString();

						if (propValue = obj["flg"])
							choice.flags = parseInt(propValue);

						return choice;
					}

					// Variable reference
					if (propValue = obj["VAR?"]) {
						return new VariableReference(propValue.toString());
					} else if (propValue = obj["CNT?"]) {
						var readCountVarRef = new VariableReference();
						readCountVarRef.pathStringForCount = propValue.toString();
						return readCountVarRef;
					}

					// Variable assignment
					var isVarAss = false;
					var isGlobalVar = false;
					if (propValue = obj["VAR="]) {
						isVarAss = true;
						isGlobalVar = true;
					} else if (propValue = obj["temp="]) {
						isVarAss = true;
						isGlobalVar = false;
					}
					if (isVarAss) {
						var varName = propValue.toString();
						var isNewDecl = !obj["re"];
						var varAss = new VariableAssignment(varName, isNewDecl);
						varAss.isGlobal = isGlobalVar;
						return varAss;
					}
					if (obj["#"] !== undefined){
						propValue = obj["#"];
						return new Tag(propValue.toString());
					}
					//list value
					if (propValue = obj["list"]) {
		//				var listContent = (Dictionary<string, object>)propValue;
						var listContent = propValue;
						var rawList = new InkList();
						if (propValue = obj["origins"]) {
		//					var namesAsObjs = (List<object>)propValue;
							var namesAsObjs = propValue;
		//					rawList.SetInitialOriginNames(namesAsObjs.Cast<string>().ToList());
							rawList.SetInitialOriginNames(namesAsObjs);
						}
						
						for (var key in listContent){
							var nameToVal = listContent[key];
							var item = new InkListItem(key);
							var val = parseInt(nameToVal);
							rawList.Add(item, val);
						}
						
						return new ListValue(rawList);
					}

					if (obj["originalChoicePath"] != null)
						return this.JObjectToChoice(obj);
				}
				
				// Array is always a Runtime.Container
				if (token instanceof Array){
					return this.JArrayToContainer(token);
				}
				
				if (token == null)
		                return null;
				
				throw "Failed to convert token to runtime object: " + JSON.stringify(token);
			}
			static RuntimeObjectToJToken(obj){
		//		var container = obj as Container;
				var container = obj;
				if (container instanceof Container) {
					return this.ContainerToJArray(container);
				}

		//		var divert = obj as Divert;
				var divert = obj;
				if (divert instanceof Divert) {
					var divTypeKey = "->";
					if (divert.isExternal)
						divTypeKey = "x()";
					else if (divert.pushesToStack) {
						if (divert.stackPushType == PushPopType.Function)
							divTypeKey = "f()";
						else if (divert.stackPushType == PushPopType.Tunnel)
							divTypeKey = "->t->";
					}

					var targetStr;
					if (divert.hasVariableTarget)
						targetStr = divert.variableDivertName;
					else
						targetStr = divert.targetPathString;

					var jObj = {};
					jObj[divTypeKey] = targetStr;

					if (divert.hasVariableTarget)
						jObj["var"] = true;
					
					if (divert.isConditional)
						jObj["c"] = true;

					if (divert.externalArgs > 0)
						jObj["exArgs"] = divert.externalArgs;

					return jObj;
				}

		//		var choicePoint = obj as ChoicePoint;
				var choicePoint = obj;
				if (choicePoint instanceof ChoicePoint) {
					var jObj = {};
					jObj["*"] = choicePoint.pathStringOnChoice;
					jObj["flg"] = choicePoint.flags;
					return jObj;
				}

		//		var intVal = obj as IntValue;
				var intVal = obj;
				if (intVal instanceof IntValue)
					return intVal.value;

		//		var floatVal = obj as FloatValue;
				var floatVal = obj;
				if (floatVal instanceof FloatValue)
					return floatVal.value;

		//		var strVal = obj as StringValue;
				var strVal = obj;
				if (strVal instanceof StringValue) {
					if (strVal.isNewline)
						return "\n";
					else
						return "^" + strVal.value;
				}
				
		//		var listVal = obj as ListValue;
				var listVal = obj;
				if (listVal instanceof ListValue) {
					return this.InkListToJObject(listVal);
				}

		//		var divTargetVal = obj as DivertTargetValue;
				var divTargetVal = obj;
				if (divTargetVal instanceof DivertTargetValue)
					return {
						"^->": divTargetVal.value.componentsString
					};

		//		var varPtrVal = obj as VariablePointerValue;
				var varPtrVal = obj;
				if (varPtrVal instanceof VariablePointerValue)
					return {
						"^var": varPtrVal.value,
						"ci": varPtrVal.contextIndex
					};

		//		var glue = obj as Runtime.Glue;
				var glue = obj;
				if (glue instanceof Glue) {
					if (glue.isBi)
						return "<>";
					else if (glue.isLeft)
						return "G<";
					else
						return "G>";
				}

		//		var controlCmd = obj as ControlCommand;
				var controlCmd = obj;
				if (controlCmd instanceof ControlCommand) {
					return _controlCommandNames[parseInt(controlCmd.commandType)];
				}

		//		var nativeFunc = obj as Runtime.NativeFunctionCall;
				var nativeFunc = obj;
				if (nativeFunc instanceof NativeFunctionCall) {
					var name = nativeFunc.name;

					// Avoid collision with ^ used to indicate a string
					if (name == "^") name = "L^";
					return name;
				}

				// Variable reference
		//		var varRef = obj as VariableReference;
				var varRef = obj;
				if (varRef instanceof VariableReference) {
					var jObj = {};
					var readCountPath = varRef.pathStringForCount;
					if (readCountPath != null) {
						jObj["CNT?"] = readCountPath;
					} else {
						jObj["VAR?"] = varRef.name;
					}

					return jObj;
				}

				// Variable assignment
		//		var varAss = obj as VariableAssignment;
				var varAss = obj;
				if (varAss instanceof VariableAssignment) {
					var key = varAss.isGlobal ? "VAR=" : "temp=";
					var jObj = {};
					jObj[key] = varAss.variableName;

					// Reassignment?
					if (!varAss.isNewDeclaration)
						jObj["re"] = true;

					return jObj;
				}

		//		var voidObj = obj as Void;
				var voidObj = obj;
				if (voidObj instanceof Void)
					return "void";
			
		//		var tag = obj as Tag;
				var tag = obj;
				if (tag instanceof Tag) {
					var jObj = {};
					jObj["#"] = tag.text;
					return jObj;
				}

				// Used when serialising save state only
		//		var choice = obj as Choice;
				var choice = obj;
				if (choice instanceof Choice)
					return this.ChoiceToJObject(choice);

				throw "Failed to convert runtime object to Json token: " + obj;
			}
			static ContainerToJArray(container){
				var jArray = this.ListToJArray(container.content);

				// Container is always an array [...]
				// But the final element is always either:
				//  - a dictionary containing the named content, as well as possibly
				//    the key "#" with the count flags
				//  - null, if neither of the above
				var namedOnlyContent = container.namedOnlyContent;
				var countFlags = container.countFlags;
				if (namedOnlyContent != null && namedOnlyContent.length > 0 || countFlags > 0 || container.name != null) {

					var terminatingObj;
					if (namedOnlyContent != null) {
						terminatingObj = this.DictionaryRuntimeObjsToJObject(namedOnlyContent);

						// Strip redundant names from containers if necessary
						for (var key in terminatingObj){
		//					var subContainerJArray = namedContentObj.Value as JArray;
							var subContainerJArray = terminatingObj[key];
							if (subContainerJArray != null) {
		//						var attrJObj = subContainerJArray [subContainerJArray.Count - 1] as JObject;
								var attrJObj = subContainerJArray[subContainerJArray.length - 1];
								if (attrJObj != null) {
									delete attrJObj["#n"];
									if (Object.keys(attrJObj).length == 0)
										subContainerJArray[subContainerJArray.length - 1] = null;
								}
							}
						}

					} else
						terminatingObj = {};

					if( countFlags > 0 )
						terminatingObj["#f"] = countFlags;

					if( container.name != null )
						terminatingObj["#n"] = container.name;

					jArray.push(terminatingObj);
				} 

				// Add null terminator to indicate that there's no dictionary
				else {
					jArray.push(null);
				}

				return jArray;
			}
			static JArrayToContainer(jArray){
				var container = new Container();
				container.content = this.JArrayToRuntimeObjList(jArray, true);

				// Final object in the array is always a combination of
				//  - named content
				//  - a "#" key with the countFlags
				// (if either exists at all, otherwise null)
		//		var terminatingObj = jArray [jArray.Count - 1] as JObject;
				var terminatingObj = jArray[jArray.length - 1];
				if (terminatingObj != null) {

					var namedOnlyContent = {};
					
					for (var key in terminatingObj){
						if (key == "#f") {
							container.countFlags = parseInt(terminatingObj[key]);
						} else if (key == "#n") {
							container.name = terminatingObj[key].toString();
						} else {
							var namedContentItem = this.JTokenToRuntimeObject(terminatingObj[key]);
		//					var namedSubContainer = namedContentItem as Container;
							var namedSubContainer = namedContentItem;
							if (namedSubContainer instanceof Container)
								namedSubContainer.name = key;
							namedOnlyContent[key] = namedContentItem;
						}
					}

					container.namedOnlyContent = namedOnlyContent;
				}

				return container;
			}
			static JObjectToChoice(jObj){
				var choice = new Choice();
				choice.text = jObj["text"].toString();
				choice.index = parseInt(jObj["index"]);
				choice.originalChoicePath = jObj["originalChoicePath"].toString();
				choice.originalThreadIndex = parseInt(jObj["originalThreadIndex"]);
				return choice;
			}
			static ChoiceToJObject(choice){
				var jObj = {};
				jObj["text"] = choice.text;
				jObj["index"] = choice.index;
				jObj["originalChoicePath"] = choice.originalChoicePath;
				jObj["originalThreadIndex"] = choice.originalThreadIndex;
				return jObj;
			}
			static InkListToJObject (listVal){
				var rawList = listVal.value;

				var dict = {};

				var content = {};
				
				rawList.forEach(function(itemAndValue){
					var item = itemAndValue.Key;
					var val = itemAndValue.Value;
					content[item.toString()] = val;
				});

				dict["list"] = content;

				if (rawList.Count == 0 && rawList.originNames != null && rawList.originNames.length > 0) {
		//			dict["origins"] = rawList.originNames.Cast<object> ().ToList ();
					dict["origins"] = rawList.originNames;
				}

				return dict;
			}
			static ListDefinitionsToJToken(origin){
				var result = {};
				
				origin.lists.forEach(function(def){
					var listDefJson = {};
					def.items.forEach(function(itemToVal){
						var item = itemToVal.Key;
						var val = itemToVal.Value;
						listDefJson[item.itemName] = val;
					});
					
					result[def.name] = listDefJson;
				});
				
				return result;
			}
			static JTokenToListDefinitions(obj){
		//		var defsObj = (Dictionary<string, object>)obj;
				var defsObj = obj;

				var allDefs = [];
				
				for (var key in defsObj){
					var name = key.toString();
		//			var listDefJson = (Dictionary<string, object>)kv.Value;
					var listDefJson = defsObj[key];

					// Cast (string, object) to (string, int) for items
					var items = {};
					
					for (var nameValueKey in listDefJson){
						var nameValue = listDefJson[nameValueKey];
						items[nameValueKey] = parseInt(nameValue);
					}

					var def = new ListDefinition(name, items);
					allDefs.push(def);
				}

				return new ListDefinitionsOrigin(allDefs);
			}
		}

		var _controlCommandNames = [];

		_controlCommandNames[ControlCommand.CommandType.EvalStart] = "ev";
		_controlCommandNames[ControlCommand.CommandType.EvalOutput] = "out";
		_controlCommandNames[ControlCommand.CommandType.EvalEnd] = "/ev";
		_controlCommandNames[ControlCommand.CommandType.Duplicate] = "du";
		_controlCommandNames[ControlCommand.CommandType.PopEvaluatedValue] = "pop";
		_controlCommandNames[ControlCommand.CommandType.PopFunction] = "~ret";
		_controlCommandNames[ControlCommand.CommandType.PopTunnel] = "->->";
		_controlCommandNames[ControlCommand.CommandType.BeginString] = "str";
		_controlCommandNames[ControlCommand.CommandType.EndString] = "/str";
		_controlCommandNames[ControlCommand.CommandType.NoOp] = "nop";
		_controlCommandNames[ControlCommand.CommandType.ChoiceCount] = "choiceCnt";
		_controlCommandNames[ControlCommand.CommandType.TurnsSince] = "turns";
		_controlCommandNames[ControlCommand.CommandType.ReadCount] = "readc";
		_controlCommandNames[ControlCommand.CommandType.Random] = "rnd";
		_controlCommandNames[ControlCommand.CommandType.SeedRandom] = "srnd";
		_controlCommandNames[ControlCommand.CommandType.VisitIndex] = "visit";
		_controlCommandNames[ControlCommand.CommandType.SequenceShuffleIndex] = "seq";
		_controlCommandNames[ControlCommand.CommandType.StartThread] = "thread";
		_controlCommandNames[ControlCommand.CommandType.Done] = "done";
		_controlCommandNames[ControlCommand.CommandType.End] = "end";
		_controlCommandNames[ControlCommand.CommandType.ListFromInt] = "listInt";
		_controlCommandNames[ControlCommand.CommandType.ListRange] = "range";

		for (var i$1 = 0; i$1 < ControlCommand.CommandType.TOTAL_VALUES; ++i$1) {
			if (_controlCommandNames[i$1] == null)
				throw "Control command not accounted for in serialisation";
		}

		class Element{
			constructor(type, container, contentIndex, inExpressionEvaluation){
				this.currentContainer = container;
				this.currentContentIndex = contentIndex;
				this.inExpressionEvaluation = inExpressionEvaluation || false;
				this.temporaryVariables = {};
				this.type = type;
			}
			get currentObject(){
				if (this.currentContainer && this.currentContentIndex < this.currentContainer.content.length) {
					return this.currentContainer.content[this.currentContentIndex];
				}

				return null;
			}
			set currentObject(value){
				var currentObj = value;
				if (currentObj == null) {
					this.currentContainer = null;
					this.currentContentIndex = 0;
					return;
				}

		//		currentContainer = currentObj.parent as Container;
				this.currentContainer = currentObj.parent;
				if (this.currentContainer instanceof Container)
					this.currentContentIndex = this.currentContainer.content.indexOf(currentObj);

				// Two reasons why the above operation might not work:
				//  - currentObj is already the root container
				//  - currentObj is a named container rather than being an object at an index
				if (this.currentContainer instanceof Container === false || this.currentContentIndex == -1) {
		//			currentContainer = currentObj as Container;
					this.currentContainer = currentObj;
					this.currentContentIndex = 0;
				}
			}
			Copy(){
				var copy = new Element(this.type, this.currentContainer, this.currentContentIndex, this.inExpressionEvaluation);
				Object.assign(copy.temporaryVariables, this.temporaryVariables);
				return copy;
			}
		}

		class Thread{
			constructor(jsonToken, storyContext){
				this.callstack = [];
				this.threadIndex = 0;
				this.previousContentObject = null;
				
				if (jsonToken && storyContext){
					var jThreadObj = jsonToken;
					this.threadIndex = parseInt(jThreadObj["threadIndex"]);

					var jThreadCallstack = jThreadObj["callstack"];
					
					jThreadCallstack.forEach(jElTok => {
						var jElementObj = jElTok;

						var pushPopType = parseInt(jElementObj["type"]);

						var currentContainer = null;
						var contentIndex = 0;

						var currentContainerPathStr = null;
						var currentContainerPathStrToken = jElementObj["cPath"];
						if (typeof currentContainerPathStrToken !== 'undefined') {
							currentContainerPathStr = currentContainerPathStrToken.toString();
		//					currentContainer = storyContext.ContentAtPath (new Path(currentContainerPathStr)) as Container;
							currentContainer = storyContext.ContentAtPath(new Path$1(currentContainerPathStr));
							contentIndex = parseInt(jElementObj["idx"]);
						}

						var inExpressionEvaluation = !!jElementObj["exp"];

						var el = new Element(pushPopType, currentContainer, contentIndex, inExpressionEvaluation);

						var jObjTemps = jElementObj["temp"];
						el.temporaryVariables = JsonSerialisation.JObjectToDictionaryRuntimeObjs(jObjTemps);

						this.callstack.push(el);
					});
					
					var prevContentObjPath = jThreadObj["previousContentObject"];
					if(typeof prevContentObjPath  !== 'undefined') {
						var prevPath = new Path$1(prevContentObjPath.toString());
						this.previousContentObject = storyContext.ContentAtPath(prevPath);
					}
				}
			}
			get jsonToken(){
				var threadJObj = {};

				var jThreadCallstack = [];
				this.callstack.forEach(el => {
					var jObj = {};
					if (el.currentContainer) {
						jObj["cPath"] = el.currentContainer.path.componentsString;
						jObj["idx"] = el.currentContentIndex;
					}
					jObj["exp"] = el.inExpressionEvaluation;
					jObj["type"] = parseInt(el.type);
					jObj["temp"] = JsonSerialisation.DictionaryRuntimeObjsToJObject(el.temporaryVariables);
					jThreadCallstack.push(jObj);
				});

				threadJObj["callstack"] = jThreadCallstack;
				threadJObj["threadIndex"] = this.threadIndex;
				
				if (this.previousContentObject != null)
					threadJObj["previousContentObject"] = this.previousContentObject.path.toString();

				return threadJObj;
			}
			Copy(){
				var copy = new Thread();
				copy.threadIndex = this.threadIndex;
				this.callstack.forEach(e => {
					copy.callstack.push(e.Copy());
				});
				copy.previousContentObject = this.previousContentObject;
				return copy;
			}
		}

		class CallStack{
			constructor(copyOrrootContentContainer){
				this._threads = [];
				this._threadCounter = 0;
				this._threads.push(new Thread());
				
				if (copyOrrootContentContainer instanceof CallStack){
					this._threads = [];
					
					copyOrrootContentContainer._threads.forEach(otherThread => {
						this._threads.push(otherThread.Copy());
					});
				}
				else{
		        	this._threads[0].callstack.push(new Element(PushPopType.Tunnel, copyOrrootContentContainer, 0));
				}
			}
			get currentThread(){
				return this._threads[this._threads.length - 1];
			}
			set currentThread(value){
				if (this._threads.length != 1) console.warn("Shouldn't be directly setting the current thread when we have a stack of them");
				
				this._threads.length = 0;
				this._threads.push(value);
			}
			get callStack(){
				return this.currentThread.callstack;
			}
			get elements(){
				return this.callStack;
			}
			get depth(){
				return this.elements.length;
			}
			get currentElement(){
				return this.callStack[this.callStack.length - 1];
			}
			get currentElementIndex(){
				return this.callStack.length - 1;
			}
			get canPop(){
				return this.callStack.length > 1;
			}
			get canPopThread(){
				return this._threads.length > 1;
			}
			
			CanPop(type){
				if (!this.canPop)
					return false;

				if (type == null)
					return true;

				return this.currentElement.type == type;
			}
			Pop(type){
				if (this.CanPop(type)) {
					this.callStack.pop();
					return;
				} else {
					throw "Mismatched push/pop in Callstack";
				}
			}
			Push(type){
				// When pushing to callstack, maintain the current content path, but jump out of expressions by default
				this.callStack.push(new Element(type, this.currentElement.currentContainer, this.currentElement.currentContentIndex, false));
			}
			PushThread(){
				var newThread = this.currentThread.Copy();
				this._threadCounter++;
				newThread.threadIndex = this._threadCounter;
				this._threads.push(newThread);
			}
			PopThread(){
				if (this.canPopThread) {
					this._threads.splice(this._threads.indexOf(this.currentThread), 1);//should be equivalent to a pop()
				} else {
					throw "Can't pop thread";
				}
			}
			SetJsonToken(token, storyContext){
				this._threads.length = 0;

				var jObject = token;

				var jThreads = jObject["threads"];
				
				jThreads.forEach(jThreadTok => {
					var thread = new Thread(jThreadTok, storyContext);
					this._threads.push(thread);
				});

				this._threadCounter = parseInt(jObject["threadCounter"]);
			}
			GetJsonToken(){
				var jObject = {};

				var jThreads = [];
				this._threads.forEach(thread => {
					jThreads.push(thread.jsonToken);
				});

				jObject["threads"] = jThreads;
				jObject["threadCounter"] = this._threadCounter;

				return jObject;
			}
			GetTemporaryVariableWithName(name, contextIndex){
				contextIndex = (typeof contextIndex === 'undefined') ? -1 : contextIndex;
				
				if (contextIndex == -1) 
					contextIndex = this.currentElementIndex + 1;
				
				var varValue = null;

				var contextElement = this.callStack[contextIndex - 1];

				if (varValue = contextElement.temporaryVariables[name]) {
					return varValue;
				} else {
					return null;
				}
			}
			SetTemporaryVariable(name, value, declareNew, contextIndex){
				contextIndex = (typeof contextIndex === 'undefined') ? -1 : contextIndex;
				
				if (contextIndex == -1) 
					contextIndex = this.currentElementIndex + 1;

				var contextElement = this.callStack[contextIndex - 1];

				if (!declareNew && !contextElement.temporaryVariables[name]) {
					throw new StoryException("Could not find temporary variable to set: " + name);
				}
				
				var oldValue;
				if( oldValue = contextElement.temporaryVariables[name] )
					ListValue.RetainListOriginsForAssignment(oldValue, value);

				contextElement.temporaryVariables[name] = value;
			}
			ContextForVariableNamed(name){
				// Current temporary context?
				// (Shouldn't attempt to access contexts higher in the callstack.)
				if (this.currentElement.temporaryVariables[name]) {
					return this.currentElementIndex + 1;
				} 

				// Global
				else {
					return 0;
				}
			}
			ThreadWithIndex(index){
				var filtered = this._threads.filter(t => {
					if (t.threadIndex == index) return t;
				});
				
				return filtered[0];
			}
		}

		//still needs: 
		// - varchanged events
		// - see if the internal getenumarators are needed
		class VariablesState{
			constructor(callStack, listDefsOrigin){
				this._globalVariables = {};
				this._callStack = callStack;
				this._listDefsOrigin = listDefsOrigin;
				
				this._batchObservingVariableChanges = null;
				this._changedVariables = null;
				
				//the way variableChangedEvent is a bit different than the reference implementation. Originally it uses the C# += operator to add delegates, but in js we need to maintain an actual collection of delegates (ie. callbacks)
				//to register a new one, there is a special ObserveVariableChange method below.
				this.variableChangedEvent = null;
				this.variableChangedEventCallbacks = [];
				
				//if es6 proxies are available, use them.
				try{
					//the proxy is used to allow direct manipulation of global variables. It first tries to access the objetcs own property, and if none is found it delegates the call to the $ method, defined below
					var p = new Proxy(this, {
						get: function(target, name){
							return (name in target) ? target[name] : target.$(name);
						},
						set: function(target, name, value){
							if (name in target) target[name] = value;
							else target.$(name, value);
							return true;//returning a fasly value make sthe trap fail
						}
					});
					
					return p;
				}
				catch(e){
					//thr proxy object is not available in this context. we should warn the dev but writting to the console feels a bit intrusive.
		//			console.log("ES6 Proxy not available - direct manipulation of global variables can't work, use $() instead.");
				}
			}
			get callStack(){
				return this._callStack;
			}
			set callStack(callStack){
				this._callStack = callStack;
			}
			get batchObservingVariableChanges(){
				return this._batchObservingVariableChanges;
			}
			set batchObservingVariableChanges(value){
				value = !!value;
				this._batchObservingVariableChanges = value;
				if (value) {
					this._changedVariables = [];
				} 

				// Finished observing variables in a batch - now send 
				// notifications for changed variables all in one go.
				else {
					if (this._changedVariables != null) {
						this._changedVariables.forEach(variableName => {
							var currentValue = this._globalVariables[variableName];
							this.variableChangedEvent(variableName, currentValue);
						});
					}

					this._changedVariables = null;
				}
			}
			get jsonToken(){
				return JsonSerialisation.DictionaryRuntimeObjsToJObject(this._globalVariables);
			}
			set jsonToken(value){
				this._globalVariables = JsonSerialisation.JObjectToDictionaryRuntimeObjs(value);
			}
			
			/**
			 * This function is specific to the js version of ink. It allows to register a callback that will be called when a variable changes. The original code uses `state.variableChangedEvent += callback` instead.
			 * @param {function} callback 
			 */
			ObserveVariableChange(callback){
				if (this.variableChangedEvent == null){
					this.variableChangedEvent = (variableName, newValue) => {
						this.variableChangedEventCallbacks.forEach(cb => {
							cb(variableName, newValue);
						});
					};
				}
				
				this.variableChangedEventCallbacks.push(callback);
			}
			CopyFrom(toCopy){
				this._globalVariables = Object.assign({}, toCopy._globalVariables);
				
				this.variableChangedEvent = toCopy.variableChangedEvent;

				if (toCopy.batchObservingVariableChanges != this.batchObservingVariableChanges) {

					if (toCopy.batchObservingVariableChanges) {
						this._batchObservingVariableChanges = true;
						this._changedVariables = toCopy._changedVariables;
					} else {
						this._batchObservingVariableChanges = false;
						this._changedVariables = null;
					}
				}
			}
			GetVariableWithName(name,contextIndex){
				if (typeof contextIndex === 'undefined') contextIndex = -1;
				
				var varValue = this.GetRawVariableWithName(name, contextIndex);

				// Get value from pointer?
		//		var varPointer = varValue as VariablePointerValue;
				var varPointer = varValue;
				if (varPointer instanceof VariablePointerValue) {
					varValue = this.ValueAtVariablePointer(varPointer);
				}

				return varValue;
			}
			GetRawVariableWithName(name, contextIndex){
				var varValue = null;

				// 0 context = global
				if (contextIndex == 0 || contextIndex == -1) {
					if ( varValue = this._globalVariables[name] )
						return varValue;
					
					var listItemValue = this._listDefsOrigin.FindSingleItemListWithName(name);
					if (listItemValue)
						return listItemValue;
				}

				// Temporary
				varValue = this._callStack.GetTemporaryVariableWithName(name, contextIndex);

				if (varValue == null)
					throw "RUNTIME ERROR: Variable '"+name+"' could not be found in context '"+contextIndex+"'. This shouldn't be possible so is a bug in the ink engine. Please try to construct a minimal story that reproduces the problem and report to inkle, thank you!";

				return varValue;
			}
			ValueAtVariablePointer(pointer){
				 return this.GetVariableWithName(pointer.variableName, pointer.contextIndex);
			}
			Assign(varAss, value){
				var name = varAss.variableName;
				var contextIndex = -1;

				// Are we assigning to a global variable?
				var setGlobal = false;
				if (varAss.isNewDeclaration) {
					setGlobal = varAss.isGlobal;
				} else {
					setGlobal = !!this._globalVariables[name];
				}

				// Constructing new variable pointer reference
				if (varAss.isNewDeclaration) {
		//			var varPointer = value as VariablePointerValue;
					var varPointer = value;
					if (varPointer instanceof VariablePointerValue) {
						var fullyResolvedVariablePointer = this.ResolveVariablePointer(varPointer);
						value = fullyResolvedVariablePointer;
					}

				} 

				// Assign to existing variable pointer?
				// Then assign to the variable that the pointer is pointing to by name.
				else {

					// De-reference variable reference to point to
					var existingPointer = null;
					do {
		//				existingPointer = GetRawVariableWithName (name, contextIndex) as VariablePointerValue;
						existingPointer = this.GetRawVariableWithName(name, contextIndex);
						if (existingPointer instanceof VariablePointerValue) {
							name = existingPointer.variableName;
							contextIndex = existingPointer.contextIndex;
							setGlobal = (contextIndex == 0);
						}
					} while(existingPointer instanceof VariablePointerValue);
				}


				if (setGlobal) {
					this.SetGlobal(name, value);
				} else {
					this._callStack.SetTemporaryVariable(name, value, varAss.isNewDeclaration, contextIndex);
				}
			}
			RetainListOriginsForAssignment(oldValue, newValue){
		//		var oldList = oldValue as ListValue;
				var oldList = oldValue;
		//		var newList = newValue as ListValue;
				var newList = newValue;
				
				if (oldList instanceof ListValue && newList instanceof ListValue && newList.value.Count == 0)
					newList.value.SetInitialOriginNames(oldList.value.originNames);
			}
			SetGlobal(variableName, value){
				var oldValue = null;
				oldValue = this._globalVariables[variableName];
				
				ListValue.RetainListOriginsForAssignment(oldValue, value);

				this._globalVariables[variableName] = value;

				if (this.variableChangedEvent != null && value !== oldValue) {

					if (this.batchObservingVariableChanges) {
						this._changedVariables.push(variableName);
					} else {
						this.variableChangedEvent(variableName, value);
					}
				}
			}
			ResolveVariablePointer(varPointer){
				var contextIndex = varPointer.contextIndex;

				if( contextIndex == -1 )
					contextIndex = this.GetContextIndexOfVariableNamed(varPointer.variableName);

				var valueOfVariablePointedTo = this.GetRawVariableWithName(varPointer.variableName, contextIndex);

				// Extra layer of indirection:
				// When accessing a pointer to a pointer (e.g. when calling nested or 
				// recursive functions that take a variable references, ensure we don't create
				// a chain of indirection by just returning the final target.
		//		var doubleRedirectionPointer = valueOfVariablePointedTo as VariablePointerValue;
				var doubleRedirectionPointer = valueOfVariablePointedTo;
				if (doubleRedirectionPointer instanceof VariablePointerValue) {
					return doubleRedirectionPointer;
				} 

				// Make copy of the variable pointer so we're not using the value direct from
				// the runtime. Temporary must be local to the current scope.
				else {
					return new VariablePointerValue(varPointer.variableName, contextIndex);
				}
			}
			GetContextIndexOfVariableNamed(varName){
				if (this._globalVariables[varName])
					return 0;

				return this._callStack.currentElementIndex;
			}
			//the original code uses a magic getter and setter for global variables, allowing things like variableState['varname]. This is not quite possible in js without a Proxy, so it is replaced with this $ function.
			$(variableName, value){
				if (typeof value === 'undefined'){
					var varContents = this._globalVariables[variableName];
					if ( typeof varContents !== 'undefined' )
			//			return (varContents as Runtime.Value).valueObject;
						return varContents.valueObject;
					else
						return null;
				}
				else{
					if (typeof this._globalVariables[variableName] === 'undefined'){
						throw new StoryException("Variable '" + variableName + "' doesn't exist, so can't be set.");
					}
					
					var val = Value.Create(value);
					if (val == null) {
						if (value == null) {
							throw new StoryException("Cannot pass null to VariableState");
						} else {
							throw new StoryException("Invalid value passed to VariableState: "+value.toString());
						}
					}

					this.SetGlobal(variableName, val);
				}
			}
		}

		//Taken from https://gist.github.com/blixt/f17b47c62508be59987b
		//Ink uses a seedable PRNG of which there is none in native javascript.
		class PRNG{
			constructor(seed){
				this._seed = seed % 2147483647;
		  		if (this._seed <= 0) this._seed += 2147483646;
			}
			next(){
				return this._seed = this._seed * 16807 % 2147483647;
			}
			nextFloat(){
				return (this.next() - 1) / 2147483646;
			}
		}

		class StoryState{
			constructor(story){		
				//actual constructor
				this.story = story;
				
				this._outputStream = [];
				this._outputStreamTextDirty = true;
				this._outputStreamTagsDirty = true;
				this.OutputStreamDirty();

				this._evaluationStack = [];

				this.callStack = new CallStack(story.rootContentContainer);
				this._variablesState = new VariablesState(this.callStack, story.listDefinitions);

				this._visitCounts = {};
				this._turnIndices = {};
				this._currentTurnIndex = -1;
				
				this.divertedTargetObject = null;

				var timeSeed = (new Date()).getTime();
				this.storySeed = (new PRNG(timeSeed)).next() % 100;
				this.previousRandom = 0;

				this._currentChoices = [];
				this._currentText = null;
				this._currentTags = null;
				this._currentErrors = null;
				
				this.didSafeExit = false;
				
				this._isExternalFunctionEvaluation = false;
				this._originalCallstack = null;
				this._originalEvaluationStackHeight = 0;

				this.GoToStart();
			}
			get currentChoices(){
				// If we can continue generating text content rather than choices,
				// then we reflect the choice list as being empty, since choices
				// should always come at the end.
				if ( this.canContinue ) return [];
				return this._currentChoices;
			}
			get generatedChoices(){
				return this._currentChoices;
			}
			get currentErrors(){
				return this._currentErrors;
			}
			get visitCounts(){
				return this._visitCounts;
			}
			get turnIndices(){
				return this._turnIndices;
			}
			get currentTurnIndex(){
				return this._currentTurnIndex;
			}
			get variablesState(){
				return this._variablesState;
			}
			get currentContentObject(){
				return this.callStack.currentElement.currentObject;
			}
			set currentContentObject(value){
				this.callStack.currentElement.currentObject = value;
			}
			get canContinue(){
				return this.currentContentObject != null && !this.hasError;
			}
			get hasError(){
				return this.currentErrors != null && this.currentErrors.length > 0;
			}
			get inExpressionEvaluation(){
				return this.callStack.currentElement.inExpressionEvaluation;
			}
			set inExpressionEvaluation(value){
				this.callStack.currentElement.inExpressionEvaluation = value;
			}
			get evaluationStack(){
				return this._evaluationStack;
			}
			get outputStreamEndsInNewline(){
				if (this._outputStream.length > 0) {

					for (var i = this._outputStream.length - 1; i >= 0; i--) {
						var obj = this._outputStream[i];
						if (obj instanceof ControlCommand) // e.g. BeginString
							break;
						var text = this._outputStream[i];
						if (text instanceof StringValue) {
							if (text.isNewline)
								return true;
							else if (text.isNonWhitespace)
								break;
						}
					}
				}

				return false;
			}
			get outputStreamContainsContent(){
				for (var i = 0; i < this._outputStream.length; i++){
					if (this._outputStream[i] instanceof StringValue)
						return true;
				}
				return false;
			}
			get currentGlueIndex(){
				for (var i = this._outputStream.length - 1; i >= 0; i--) {
					var c = this._outputStream[i];
		//			var glue = c as Glue;
					var glue = c;
					if (glue instanceof Glue)
						return i;
					else if (c instanceof ControlCommand) // e.g. BeginString
						break;
				}
				return -1;
			}
			get currentRightGlue(){
				for (var i = this._outputStream.length - 1; i >= 0; i--) {
					var c = this._outputStream[i];
		//			var glue = c as Glue;
					var glue = c;
					if (glue instanceof Glue && glue.isRight)
						return glue;
					else if (c instanceof ControlCommand) // e.g. BeginString
						break;
				}
				return null;
			}
			get inStringEvaluation(){
				for (var i = this._outputStream.length - 1; i >= 0; i--) {
		//			var cmd = this._outputStream[i] as ControlCommand;
					var cmd = this._outputStream[i];
					if (cmd instanceof ControlCommand && cmd.commandType == ControlCommand.CommandType.BeginString) {
						return true;
					}
				}

				return false;
			}
			get currentText(){
				if( this._outputStreamTextDirty ) {
					var sb = new StringBuilder();

					this._outputStream.forEach(outputObj => {
			//			var textContent = outputObj as StringValue;
						var textContent = outputObj;
						if (textContent instanceof StringValue) {
							sb.Append(textContent.value);
						}
					});

					this._currentText = sb.toString();
					this._outputStreamTextDirty = false;
				}
				
				return this._currentText;
			}
			get currentTags(){
				if( this._outputStreamTagsDirty ) {
					this._currentTags = [];

					this._outputStream.forEach(outputObj => {
			//			var tag = outputObj as Tag;
						var tag = outputObj;
						if (tag instanceof Tag) {
							this._currentTags.push(tag.text);
						}
					});
					
					this._outputStreamTagsDirty = false;
				}
				
				return this._currentTags;
			}
			get outputStream(){
				return this._outputStream;
			}
			get currentPath(){
				if (this.currentContentObject == null)
					return null;

				return this.currentContentObject.path;
			}
			set currentPath(value){
				if (value != null)
					this.currentContentObject = this.story.ContentAtPath(value);
				else
					this.currentContentObject = null;
			}
			get currentContainer(){
				return this.callStack.currentElement.currentContainer;
			}
			get previousContentObject(){
				return this.callStack.currentThread.previousContentObject;
			}
			set previousContentObject(value){
				this.callStack.currentThread.previousContentObject = value;
			}
			get callstackDepth(){
				return this.callStack.depth;
			}
			get jsonToken(){
				var obj = {};

				var choiceThreads = null;
				this._currentChoices.forEach(c => {
					c.originalChoicePath = c.choicePoint.path.componentsString;
					c.originalThreadIndex = c.threadAtGeneration.threadIndex;

					if( this.callStack.ThreadWithIndex(c.originalThreadIndex) == null ) {
						if( choiceThreads == null )
							choiceThreads = {};

						choiceThreads[c.originalThreadIndex.toString()] = c.threadAtGeneration.jsonToken;
					}
				});
				
				if( this.choiceThreads != null )
					obj["choiceThreads"] = this.choiceThreads;


				obj["callstackThreads"] = this.callStack.GetJsonToken();
				obj["variablesState"] = this.variablesState.jsonToken;

				obj["evalStack"] = JsonSerialisation.ListToJArray(this.evaluationStack);

				obj["outputStream"] = JsonSerialisation.ListToJArray(this._outputStream);

				obj["currentChoices"] = JsonSerialisation.ListToJArray(this._currentChoices);
				
				if( this.divertedTargetObject != null )
					obj["currentDivertTarget"] = this.divertedTargetObject.path.componentsString;

				obj["visitCounts"] = JsonSerialisation.IntDictionaryToJObject(this.visitCounts);
				obj["turnIndices"] = JsonSerialisation.IntDictionaryToJObject(this.turnIndices);
				obj["turnIdx"] = this.currentTurnIndex;
				obj["storySeed"] = this.storySeed;

				obj["inkSaveVersion"] = StoryState.kInkSaveStateVersion;

				// Not using this right now, but could do in future.
				obj["inkFormatVersion"] = this.story.inkVersionCurrent;

				return obj;
			}
			set jsonToken(value){
				var jObject = value;

				var jSaveVersion = jObject["inkSaveVersion"];
				if (jSaveVersion == null) {
					throw new StoryException("ink save format incorrect, can't load.");
				}
				else if (parseInt(jSaveVersion) < StoryState.kMinCompatibleLoadVersion) {
					throw new StoryException("Ink save format isn't compatible with the current version (saw '"+jSaveVersion+"', but minimum is "+StoryState.kMinCompatibleLoadVersion+"), so can't load.");
				}

				this.callStack.SetJsonToken(jObject["callstackThreads"], this.story);
				this.variablesState.jsonToken = jObject["variablesState"];

				this._evaluationStack = JsonSerialisation.JArrayToRuntimeObjList(jObject["evalStack"]);

				this._outputStream = JsonSerialisation.JArrayToRuntimeObjList(jObject["outputStream"]);
				this.OutputStreamDirty();

		//		currentChoices = Json.JArrayToRuntimeObjList<Choice>((JArray)jObject ["currentChoices"]);
				this._currentChoices = JsonSerialisation.JArrayToRuntimeObjList(jObject["currentChoices"]);

				var currentDivertTargetPath = jObject["currentDivertTarget"];
				if (currentDivertTargetPath != null) {
					var divertPath = new Path$1(currentDivertTargetPath.toString());
					this.divertedTargetObject = this.story.ContentAtPath(divertPath);
				}

				this._visitCounts = JsonSerialisation.JObjectToIntDictionary(jObject["visitCounts"]);
				this._turnIndices = JsonSerialisation.JObjectToIntDictionary(jObject["turnIndices"]);
				this._currentTurnIndex = parseInt(jObject["turnIdx"]);
				this.storySeed = parseInt(jObject["storySeed"]);

		//		var jChoiceThreads = jObject["choiceThreads"] as JObject;
				var jChoiceThreads = jObject["choiceThreads"];
				
				this._currentChoices.forEach(c => {
					c.choicePoint = this.story.ContentAtPath(new Path$1(c.originalChoicePath));

					var foundActiveThread = this.callStack.ThreadWithIndex(c.originalThreadIndex);
					if( foundActiveThread != null ) {
						c.threadAtGeneration = foundActiveThread;
					} else {
						var jSavedChoiceThread = jChoiceThreads[c.originalThreadIndex.toString()];
						c.threadAtGeneration = new CallStack.Thread(jSavedChoiceThread, this.story);
					}
				});
			}
			
			MatchRightGlueForLeftGlue(leftGlue){
				if (!leftGlue.isLeft) return null;
				
				for (var i = this._outputStream.length - 1; i >= 0; i--) {
					var c = this._outputStream[i];
		//			var g = c as Glue;
					var g = c;
					if (g instanceof Glue && g.isRight && g.parent == leftGlue.parent) {
						return g;
					} else if (c instanceof ControlCommand) // e.g. BeginString
						break;
				}
				
				return null;
			}
			GoToStart(){
				this.callStack.currentElement.currentContainer = this.story.mainContentContainer;
		        this.callStack.currentElement.currentContentIndex = 0;
			}
			ResetErrors(){
				this._currentErrors = null;
			}
			ResetOutput(){
				this._outputStream.length = 0;
				this.OutputStreamDirty();
			}
			PushEvaluationStack(obj){
		//		var listValue = obj as ListValue;
				var listValue = obj;
				if (listValue instanceof ListValue) {

					// Update origin when list is has something to indicate the list origin
					var rawList = listValue.value;
					var names = rawList.originNames;
					if (names != null) {
						var origins = [];
						
						names.forEach((n)=>{
							var def = null;
							def = this.story.listDefinitions.TryGetDefinition(n, def);
							if( origins.indexOf(def) < 0 )
								origins.push(def);
						});

						rawList.origins = origins;
					}
				}
				
				this.evaluationStack.push(obj);
			}
			PopEvaluationStack(numberOfObjects){
				if (!numberOfObjects){
					var obj = this.evaluationStack.pop();
					return obj;
				}
				else{
					if(numberOfObjects > this.evaluationStack.length) {
		                throw "trying to pop too many objects";
		            }

		            var popped = this.evaluationStack.splice(this.evaluationStack.length - numberOfObjects, numberOfObjects);
		            return popped;
				}
			}
			PeekEvaluationStack(){
				 return this.evaluationStack[this.evaluationStack.length - 1];
			}
			PushToOutputStream(obj){
		//		var text = obj as StringValue;
				var text = obj;
				if (text instanceof StringValue) {
					var listText = this.TrySplittingHeadTailWhitespace(text);
					if (listText != null) {
						listText.forEach(textObj => {
							this.PushToOutputStreamIndividual(textObj);	
						});
						return;
					}
				}

				this.PushToOutputStreamIndividual(obj);
				this.OutputStreamDirty();
			}
			TrySplittingHeadTailWhitespace(single){
				var str = single.value;

				var headFirstNewlineIdx = -1;
				var headLastNewlineIdx = -1;
				for (var i = 0; i < str.length; ++i) {
					var c = str[i];
					if (c == '\n') {
						if (headFirstNewlineIdx == -1)
							headFirstNewlineIdx = i;
						headLastNewlineIdx = i;
					}
					else if (c == ' ' || c == '\t')
						continue;
					else
						break;
				}

				var tailLastNewlineIdx = -1;
				var tailFirstNewlineIdx = -1;
				for (var i = 0; i < str.length; ++i) {
					var c = str[i];
					if (c == '\n') {
						if (tailLastNewlineIdx == -1)
							tailLastNewlineIdx = i;
						tailFirstNewlineIdx = i;
					}
					else if (c == ' ' || c == '\t')
						continue;
					else
						break;
				}

				// No splitting to be done?
				if (headFirstNewlineIdx == -1 && tailLastNewlineIdx == -1)
					return null;

				var listTexts = [];
				var innerStrStart = 0;
				var innerStrEnd = str.length;

				if (headFirstNewlineIdx != -1) {
					if (headFirstNewlineIdx > 0) {
						var leadingSpaces = str.substring(0, headFirstNewlineIdx);
						listTexts.push(leadingSpaces);
					}
					listTexts.push(new StringValue("\n"));
					innerStrStart = headLastNewlineIdx + 1;
				}

				if (tailLastNewlineIdx != -1) {
					innerStrEnd = tailFirstNewlineIdx;
				}

				if (innerStrEnd > innerStrStart) {
					var innerStrText = str.substring(innerStrStart, innerStrEnd - innerStrStart);
					listTexts.push(new StringValue(innerStrText));
				}

				if (tailLastNewlineIdx != -1 && tailFirstNewlineIdx > headLastNewlineIdx) {
					listTexts.push(new StringValue("\n"));
					if (tailLastNewlineIdx < str.length - 1) {
						var numSpaces = (str.Length - tailLastNewlineIdx) - 1;
						var trailingSpaces = new StringValue(str.substring(tailLastNewlineIdx + 1, numSpaces));
						listTexts.push(trailingSpaces);
					}
				}

				return listTexts;
			}
			PushToOutputStreamIndividual(obj){
				var glue = obj;
				var text = obj;

				var includeInOutput = true;

				if (glue instanceof Glue) {
					// Found matching left-glue for right-glue? Close it.
					var existingRightGlue = this.currentRightGlue;
					var foundMatchingLeftGlue = !!(glue.isLeft && existingRightGlue && glue.parent == existingRightGlue.parent);
					var matchingRightGlue = null;
					
					if (glue.isLeft)
						matchingRightGlue = this.MatchRightGlueForLeftGlue(glue);

					// Left/Right glue is auto-generated for inline expressions 
					// where we want to absorb newlines but only in a certain direction.
					// "Bi" glue is written by the user in their ink with <>
					if (glue.isLeft || glue.isBi) {
						this.TrimNewlinesFromOutputStream(matchingRightGlue);
					}

					includeInOutput = glue.isBi || glue.isRight;
				}

				else if( text instanceof StringValue ) {

					if (this.currentGlueIndex != -1) {

						// Absorb any new newlines if there's existing glue
						// in the output stream.
						// Also trim any extra whitespace (spaces/tabs) if so.
						if (text.isNewline) {
							this.TrimFromExistingGlue();
							includeInOutput = false;
						} 

						// Able to completely reset when 
						else if (text.isNonWhitespace) {
							this.RemoveExistingGlue();
						}
					} else if (text.isNewline) {
						if (this.outputStreamEndsInNewline || !this.outputStreamContainsContent)
							includeInOutput = false;
					}
				}

				if (includeInOutput) {
					this._outputStream.push(obj);
					this.OutputStreamDirty();
				}
			}
			TrimNewlinesFromOutputStream(rightGlueToStopAt){
				var removeWhitespaceFrom = -1;
				var rightGluePos = -1;
				var foundNonWhitespace = false;

				// Work back from the end, and try to find the point where
				// we need to start removing content. There are two ways:
				//  - Start from the matching right-glue (because we just saw a left-glue)
				//  - Simply work backwards to find the first newline in a string of whitespace
				var i = this._outputStream.length-1;
				while (i >= 0) {
					var obj = this._outputStream[i];
		//			var cmd = obj as ControlCommand;
					var cmd = obj;
		//			var txt = obj as StringValue;
					var txt = obj;
		//			var glue = obj as Glue;
					var glue = obj;

					if (cmd instanceof ControlCommand || (txt instanceof StringValue && txt.isNonWhitespace)) {
						foundNonWhitespace = true;
						if( rightGlueToStopAt == null )
							break;
					} else if (rightGlueToStopAt && glue instanceof Glue && glue == rightGlueToStopAt) {
						rightGluePos = i;
						break;
					} else if (txt instanceof StringValue && txt.isNewline && !foundNonWhitespace) {
						removeWhitespaceFrom = i;
					}
					i--;
				}

				// Remove the whitespace
				if (removeWhitespaceFrom >= 0) {
					i=removeWhitespaceFrom;
					while(i < this._outputStream.length) {
		//				var text = _outputStream [i] as StringValue;
						var text = this._outputStream[i];
						if (text instanceof StringValue) {
							this._outputStream.splice(i, 1);
						} else {
							i++;
						}
					}
				}

				if (rightGlueToStopAt && rightGluePos > -1) {
					i = rightGluePos;
					while(i < this._outputStream.length) {
						if (this._outputStream[i] instanceof Glue && (this._outputStream[i]).isRight) {
							this.outputStream.splice(i, 1);
						} else {
							i++;
						}
					}
				}
				
				this.OutputStreamDirty();
			}
			TrimFromExistingGlue(){
				var i = this.currentGlueIndex;
				while (i < this._outputStream.length) {
		//			var txt = _outputStream [i] as StringValue;
					var txt = this._outputStream[i];
					if (txt instanceof StringValue && !txt.isNonWhitespace)
						this._outputStream.splice(i, 1);
					else
						i++;
				}
				
				this.OutputStreamDirty();
			}
			RemoveExistingGlue(){
				for (var i = this._outputStream.length - 1; i >= 0; i--) {
					var c = this._outputStream[i];
					if (c instanceof Glue) {
						this._outputStream.splice(i, 1);
					} else if( c instanceof ControlCommand ) { // e.g. BeginString
						break;
					}
				}
				
				this.OutputStreamDirty();
			}
			ForceEnd(){
				while (this.callStack.canPopThread)
					this.callStack.PopThread();

				while (this.callStack.canPop)
					this.callStack.Pop();

				this._currentChoices.length = 0;
				
				this.currentContentObject = null;
				this.previousContentObject = null;

				this.didSafeExit = true;
			}
			SetChosenPath(path){
				// Changing direction, assume we need to clear current set of choices
				this._currentChoices.length = 0;

				this.currentPath = path;

				this._currentTurnIndex++;
			}
			StartExternalFunctionEvaluation(funcContainer, args){
				 // We'll start a new callstack, so keep hold of the original,
				// as well as the evaluation stack so we know if the function 
				// returned something
				this._originalCallstack = this.callStack;
				this._originalEvaluationStackHeight = this.evaluationStack.length;

				// Create a new base call stack element.
				this.callStack = new CallStack(funcContainer);
				this.callStack.currentElement.type = PushPopType.Function;
				
				this._variablesState.callStack = this.callStack;

				// By setting ourselves in external function evaluation mode,
				// we're saying it's okay to end the flow without a Done or End,
				// but with a ~ return instead.
				this._isExternalFunctionEvaluation = true;
				
				this.PassArgumentsToEvaluationStack(args);
			}
			PassArgumentsToEvaluationStack(args){
				// Pass arguments onto the evaluation stack
				if (args != null) {
					for (var i = 0; i < args.length; i++) {
						if (!(typeof args[i] === 'number' || typeof args[i] === 'string')) {
							throw "ink arguments when calling EvaluateFunction / ChoosePathStringWithParameters  must be int, float or string";
						}

						this.PushEvaluationStack(Value.Create(args[i]));
					}
				}
			}
			TryExitExternalFunctionEvaluation(){
				if (this._isExternalFunctionEvaluation && this.callStack.elements.length == 1 && this.callStack.currentElement.type == PushPopType.Function) {
					this.currentContentObject = null;
					this.didSafeExit = true;
					return true;
				}

				return false;
			}
			CompleteExternalFunctionEvaluation(){
				// Do we have a returned value?
				// Potentially pop multiple values off the stack, in case we need
				// to clean up after ourselves (e.g. caller of EvaluateFunction may 
				// have passed too many arguments, and we currently have no way to check for that)
				var returnedObj = null;
				while (this.evaluationStack.length > this._originalEvaluationStackHeight) {
					var poppedObj = this.PopEvaluationStack();
					if (returnedObj == null)
						returnedObj = poppedObj;
				}
				
				// Restore our own state
				this.callStack = this._originalCallstack;
				this._originalCallstack = null;
				this._originalEvaluationStackHeight = 0;
				
				this._variablesState.callStack = this.callStack;

				if (returnedObj) {
					if (returnedObj instanceof Void)
						return null;

					// Some kind of value, if not void
		//			var returnVal = returnedObj as Runtime.Value;
					var returnVal = returnedObj;

					// DivertTargets get returned as the string of components
					// (rather than a Path, which isn't public)
					if (returnVal.valueType == ValueType.DivertTarget) {
						return returnVal.valueObject.toString();
					}

					// Other types can just have their exact object type:
					// int, float, string. VariablePointers get returned as strings.
					return returnVal.valueObject;
				}

				return null;
			}
			AddError(message){
				if (this._currentErrors == null) {
					this._currentErrors = [];
				}

				this._currentErrors.push(message);
			}
			OutputStreamDirty(){
				this._outputStreamTextDirty = true;
				this._outputStreamTagsDirty = true;
			}
			VisitCountAtPathString(pathString){
				var visitCountOut;
				if (visitCountOut = this.visitCounts[pathString])
					return visitCountOut;

				return 0;
			}
			Copy(){
				var copy = new StoryState(this.story);

				copy.outputStream.push.apply(copy.outputStream, this._outputStream);
				this.OutputStreamDirty();
				
				copy._currentChoices.push.apply(copy._currentChoices, this._currentChoices);

				if (this.hasError) {
					copy.currentErrors = [];
					copy.currentErrors.push.apply(copy.currentErrors, this.currentErrors);
				}

				copy.callStack = new CallStack(this.callStack);
				if (this._originalCallstack) copy._originalCallstack = new CallStack(this._originalCallstack);
				
				copy._variablesState = new VariablesState(copy.callStack, this.story.listDefinitions);
				copy.variablesState.CopyFrom(this.variablesState);

				copy.evaluationStack.push.apply(copy.evaluationStack, this.evaluationStack);
		    copy._originalEvaluationStackHeight = this._originalEvaluationStackHeight;

				if (this.divertedTargetObject != null)
					copy.divertedTargetObject = this.divertedTargetObject;

				copy.previousContentObject = this.previousContentObject;
				
				copy._isExternalFunctionEvaluation = this._isExternalFunctionEvaluation;
				
				copy._visitCounts = {};
				for (var keyValue in this._visitCounts) {
				      	copy._visitCounts[keyValue] = this._visitCounts[keyValue];
				}
				copy._turnIndices = {};
				for (var keyValue in this._turnIndices) {
					copy._turnIndices[keyValue] = this._turnIndices[keyValue];
				}
		  		
				copy._currentTurnIndex = this.currentTurnIndex;
				copy.storySeed = this.storySeed;
				copy.previousRandom = this.previousRandom;

				copy.didSafeExit = this.didSafeExit;

				return copy;
			}
			
			toJson(indented){
				return JSON.stringify(this.jsonToken, null, (indented) ? 2 : 0);
			}
			LoadJson(jsonString){
				this.jsonToken = JSON.parse(jsonString);
			}
		}

		StoryState.kInkSaveStateVersion = 7;
		StoryState.kMinCompatibleLoadVersion = 6;

		if (!Number.isInteger) {
			Number.isInteger = function isInteger (nVal) {
				return typeof nVal === "number" && isFinite(nVal) && nVal > -9007199254740992 && nVal < 9007199254740992 && Math.floor(nVal) === nVal;
			};
		}

		class Story extends Object$1{
			constructor(jsonString, lists){
				super();
				
				lists = lists || null;
				
				this.inkVersionCurrent = 17;
				this.inkVersionMinimumCompatible = 16;
				
				this._variableObservers = null;
				this._externals = {};
				this._prevContainerSet = null;
				this._listDefinitions = null;
				
				if (jsonString instanceof Container){
					this._mainContentContainer = jsonString;
					
					if (lists != null)
						this._listDefinitions = new ListDefinitionsOrigin(lists);
				}
				else{
					//the original version only accepts a string as a constructor, but this is javascript and it's almost easier to get a JSON value than a string, so we're silently accepting both
					var rootObject = (typeof jsonString === 'string') ? JSON.parse(jsonString) : jsonString;

					var versionObj = rootObject["inkVersion"];
					if (versionObj == null)
						throw "ink version number not found. Are you sure it's a valid .ink.json file?";

					var formatFromFile = parseInt(versionObj);
					if (formatFromFile > this.inkVersionCurrent){
						throw "Version of ink used to build story was newer than the current verison of the engine";
					}
					else if (formatFromFile < this.inkVersionMinimumCompatible){
						throw "Version of ink used to build story is too old to be loaded by this verison of the engine";
					}
					else if (formatFromFile != this.inkVersionCurrent){
						console.warn("WARNING: Version of ink used to build story doesn't match current version of engine. Non-critical, but recommend synchronising.");
					}

					var rootToken = rootObject["root"];
					if (rootToken == null)
						throw "Root node for ink not found. Are you sure it's a valid .ink.json file?";
					
					var listDefsObj;
		            if (listDefsObj = rootObject["listDefs"]) {
		                this._listDefinitions = JsonSerialisation.JTokenToListDefinitions(listDefsObj);
		            }

					this._mainContentContainer = JsonSerialisation.JTokenToRuntimeObject(rootToken);

					this._hasValidatedExternals = null;
					this.allowExternalFunctionFallbacks = false;

					this.ResetState();
				}
			}
			
			get currentChoices(){
				// Don't include invisible choices for external usage.
				var choices = [];
				
				this._state.currentChoices.forEach(c => {
					if (!c.choicePoint.isInvisibleDefault) {
						c.index = choices.length;
						choices.push(c);
					}
				});
				
				return choices;
			}
			get currentText(){
				return this.state.currentText;
			}
			get currentTags(){
				return this.state.currentTags;
			}
			get currentErrors(){
				return this.state.currentErrors;
			}
			get hasError(){
				return this.state.hasError;
			}
			get variablesState(){
				return this.state.variablesState;
			}
			get listDefinitions (){
				return this._listDefinitions;
			}
			get state(){
				return this._state;
			}
			
			get mainContentContainer(){
				if (this._temporaryEvaluationContainer) {
					return this._temporaryEvaluationContainer;
				} else {
					return this._mainContentContainer;
				}
			}
			get canContinue(){
				return this.state.canContinue;
			}
			
			get globalTags(){
				return this.TagsAtStartOfFlowContainerWithPathString("");
			}
			
			ToJsonString(){
				var rootContainerJsonList = JsonSerialisation.RuntimeObjectToJToken(this._mainContentContainer);

				var rootObject = {};
				rootObject["inkVersion"] = this.inkVersionCurrent;
				rootObject["root"] = rootContainerJsonList;
				
				if (this._listDefinitions != null)
					rootObject["listDefs"] = JsonSerialisation.ListDefinitionsToJToken(this._listDefinitions);

				return JSON.stringify(rootObject);
			}
			ResetState(){
				this._state = new StoryState(this);
				this._state.variablesState.ObserveVariableChange(this.VariableStateDidChangeEvent.bind(this));
				
				this.ResetGlobals();
			}
			ResetErrors(){
				this._state.ResetErrors();
			}
			ResetCallstack(){
				this._state.ForceEnd();
			}
			ResetGlobals(){
				if (this._mainContentContainer.namedContent["global decl"]){
					var originalPath = this.state.currentPath;

					this.ChoosePathString("global decl");

					// Continue, but without validating external bindings,
					// since we may be doing this reset at initialisation time.
					this.ContinueInternal();

					this.state.currentPath = originalPath;
				}
			}
			Continue(){
				if (!this._hasValidatedExternals)
					this.ValidateExternalBindings();

				return this.ContinueInternal();
			}
			ContinueInternal(){
				if (!this.canContinue) {
					throw new StoryException("Can't continue - should check canContinue before calling Continue");
				}

				this._state.ResetOutput();

				this._state.didSafeExit = false;

				this._state.variablesState.batchObservingVariableChanges = true;

				try {

					var stateAtLastNewline = null;

					// The basic algorithm here is:
					//
					//     do { Step() } while( canContinue && !outputStreamEndsInNewline );
					//
					// But the complexity comes from:
					//  - Stepping beyond the newline in case it'll be absorbed by glue later
					//  - Ensuring that non-text content beyond newlines are generated - i.e. choices,
					//    which are actually built out of text content.
					// So we have to take a snapshot of the state, continue prospectively,
					// and rewind if necessary.
					// This code is slightly fragile :-/ 
					//

					do {

						// Run main step function (walks through content)
						this.Step();

						// Run out of content and we have a default invisible choice that we can follow?
						if( !this.canContinue ) {
							this.TryFollowDefaultInvisibleChoice();
						}

						// Don't save/rewind during string evaluation, which is e.g. used for choices
						if( !this.state.inStringEvaluation ) {

							// We previously found a newline, but were we just double checking that
							// it wouldn't immediately be removed by glue?
							if( stateAtLastNewline != null ) {

								// Cover cases that non-text generated content was evaluated last step
								var currText = this.currentText;
								var prevTextLength = stateAtLastNewline.currentText.length;
								var prevTagCount = stateAtLastNewline.currentTags.length;

								// Output has been extended?
								if( currText !== stateAtLastNewline.currentText || prevTagCount != this.currentTags.length ) {

									// Original newline still exists?
									if( currText.length >= prevTextLength && currText[prevTextLength-1] == '\n' ) {

										this.RestoreStateSnapshot(stateAtLastNewline);
										break;
									}

									// Newline that previously existed is no longer valid - e.g.
									// glue was encounted that caused it to be removed.
									else {
										stateAtLastNewline = null;
									}
								}

							}

							// Current content ends in a newline - approaching end of our evaluation
							if( this.state.outputStreamEndsInNewline ) {

								// If we can continue evaluation for a bit:
								// Create a snapshot in case we need to rewind.
								// We're going to continue stepping in case we see glue or some
								// non-text content such as choices.
								if( this.canContinue ) {
										// Don't bother to record the state beyond the current newline.
										// e.g.:
										// Hello world\n			// record state at the end of here
										// ~ complexCalculation()   // don't actually need this unless it generates text
										if( stateAtLastNewline == null ) {
		                                	stateAtLastNewline = this.StateSnapshot();
										}	
								} 

								// Can't continue, so we're about to exit - make sure we
								// don't have an old state hanging around.
								else {
									stateAtLastNewline = null;
								}

							}

						}

					} while(this.canContinue);

					// Need to rewind, due to evaluating further than we should?
					if( stateAtLastNewline != null ) {
						this.RestoreStateSnapshot(stateAtLastNewline);
					}

					// Finished a section of content / reached a choice point?
					if( !this.canContinue ) {

						if( this.state.callStack.canPopThread ) {
							this.Error("Thread available to pop, threads should always be flat by the end of evaluation?");
						}

						if( this.state.generatedChoices.length == 0 && !this.state.didSafeExit && this._temporaryEvaluationContainer == null) {
							if( this.state.callStack.CanPop(PushPopType.Tunnel) ) {
								this.Error("unexpectedly reached end of content. Do you need a '->->' to return from a tunnel?");
							} else if( this.state.callStack.CanPop(PushPopType.Function) ) {
								this.Error("unexpectedly reached end of content. Do you need a '~ return'?");
							} else if( !this.state.callStack.canPop ) {
								this.Error("ran out of content. Do you need a '-> DONE' or '-> END'?");
							} else {
								this.Error("unexpectedly reached end of content for unknown reason. Please debug compiler!");
							}
						}

					}


				} catch(e) {
					throw e;
					this.AddError(e.Message, e.useEndLineNumber);
				} finally {
					this.state.didSafeExit = false;
					
					this._state.variablesState.batchObservingVariableChanges = false;
				}

				return this.currentText;
			}
			ContinueMaximally(){
				var sb = new StringBuilder();

				while (this.canContinue) {
					sb.Append(this.Continue());
				}

				return sb.toString();
			}
			ContentAtPath(path){
				return this.mainContentContainer.ContentAtPath(path);
			}
			StateSnapshot(){
				return this.state.Copy();
			}
			RestoreStateSnapshot(state){
				this._state = state;
			}
			Step(){
				var shouldAddToStream = true;

				// Get current content
				var currentContentObj = this.state.currentContentObject;
				if (currentContentObj == null) {
					return;
				}
				// Step directly to the first element of content in a container (if necessary)
		//		Container currentContainer = currentContentObj as Container;
				var currentContainer = currentContentObj;
				while(currentContainer instanceof Container) {

					// Mark container as being entered
					this.VisitContainer(currentContainer, true);

					// No content? the most we can do is step past it
					if (currentContainer.content.length == 0)
						break;

					currentContentObj = currentContainer.content[0];
					this.state.callStack.currentElement.currentContentIndex = 0;
					this.state.callStack.currentElement.currentContainer = currentContainer;

		//			currentContainer = currentContentObj as Container;
					currentContainer = currentContentObj;
				}
				currentContainer = this.state.callStack.currentElement.currentContainer;

				// Is the current content object:
				//  - Normal content
				//  - Or a logic/flow statement - if so, do it
				// Stop flow if we hit a stack pop when we're unable to pop (e.g. return/done statement in knot
				// that was diverted to rather than called as a function)
				var isLogicOrFlowControl = this.PerformLogicAndFlowControl(currentContentObj);

				// Has flow been forced to end by flow control above?
				if (this.state.currentContentObject == null) {
					return;
				}

				if (isLogicOrFlowControl) {
					shouldAddToStream = false;
				}

				// Choice with condition?
		//		var choicePoint = currentContentObj as ChoicePoint;
				var choicePoint = currentContentObj;
				if (choicePoint instanceof ChoicePoint) {
					var choice = this.ProcessChoice(choicePoint);
					if (choice) {
						this.state.generatedChoices.push(choice);
					}

					currentContentObj = null;
					shouldAddToStream = false;
				}

				// If the container has no content, then it will be
				// the "content" itself, but we skip over it.
				if (currentContentObj instanceof Container) {
					shouldAddToStream = false;
				}

				// Content to add to evaluation stack or the output stream
				if (shouldAddToStream) {

					// If we're pushing a variable pointer onto the evaluation stack, ensure that it's specific
					// to our current (possibly temporary) context index. And make a copy of the pointer
					// so that we're not editing the original runtime object.
		//			var varPointer = currentContentObj as VariablePointerValue;
					var varPointer = currentContentObj;
					if (varPointer instanceof VariablePointerValue && varPointer.contextIndex == -1) {

						// Create new object so we're not overwriting the story's own data
						var contextIdx = this.state.callStack.ContextForVariableNamed(varPointer.variableName);
						currentContentObj = new VariablePointerValue(varPointer.variableName, contextIdx);
					}

					// Expression evaluation content
					if (this.state.inExpressionEvaluation) {
						this.state.PushEvaluationStack(currentContentObj);
					}
					// Output stream content (i.e. not expression evaluation)
					else {
						this.state.PushToOutputStream(currentContentObj);
					}
				}

				// Increment the content pointer, following diverts if necessary
				this.NextContent();

				// Starting a thread should be done after the increment to the content pointer,
				// so that when returning from the thread, it returns to the content after this instruction.
		//		var controlCmd = currentContentObj as ControlCommand;
				var controlCmd = currentContentObj;
				if (controlCmd instanceof ControlCommand && controlCmd.commandType == ControlCommand.CommandType.StartThread) {
					this.state.callStack.PushThread();
				}
			}
			VisitContainer(container, atStart){
				if (!container.countingAtStartOnly || atStart) {
					if (container.visitsShouldBeCounted)
						this.IncrementVisitCountForContainer(container);

					if (container.turnIndexShouldBeCounted)
						this.RecordTurnIndexVisitToContainer(container);
				}
			}
			VisitChangedContainersDueToDivert(){
				var previousContentObject = this.state.previousContentObject;
				var newContentObject = this.state.currentContentObject;
				
				if (!newContentObject)
					return;
		            
				// First, find the previously open set of containers
				this._prevContainerSet = [];
				if (previousContentObject) {
		//			Container prevAncestor = previousContentObject as Container ?? previousContentObject.parent as Container;
					var prevAncestor = (previousContentObject instanceof Container) ? previousContentObject : previousContentObject.parent;
					while (prevAncestor instanceof Container) {
						this._prevContainerSet.push(prevAncestor);
		//				prevAncestor = prevAncestor.parent as Container;
						prevAncestor = prevAncestor.parent;
					}
				}

				// If the new object is a container itself, it will be visited automatically at the next actual
				// content step. However, we need to walk up the new ancestry to see if there are more new containers
				var currentChildOfContainer = newContentObject;
		//		Container currentContainerAncestor = currentChildOfContainer.parent as Container;
				var currentContainerAncestor = currentChildOfContainer.parent;
				while (currentContainerAncestor instanceof Container && this._prevContainerSet.indexOf(currentContainerAncestor) < 0) {

					// Check whether this ancestor container is being entered at the start,
					// by checking whether the child object is the first.
					var enteringAtStart = currentContainerAncestor.content.length > 0 
						&& currentChildOfContainer == currentContainerAncestor.content[0];

					// Mark a visit to this container
					this.VisitContainer(currentContainerAncestor, enteringAtStart);

					currentChildOfContainer = currentContainerAncestor;
		//			currentContainerAncestor = currentContainerAncestor.parent as Container;
					currentContainerAncestor = currentContainerAncestor.parent;
				}
			}
			ProcessChoice(choicePoint){
				var showChoice = true;

				// Don't create choice if choice point doesn't pass conditional
				if (choicePoint.hasCondition) {
					var conditionValue = this.state.PopEvaluationStack();
					if (!this.IsTruthy(conditionValue)) {
						showChoice = false;
					}
				}

				var startText = "";
				var choiceOnlyText = "";

				if (choicePoint.hasChoiceOnlyContent) {
		//			var choiceOnlyStrVal = state.PopEvaluationStack () as StringValue;
					var choiceOnlyStrVal = this.state.PopEvaluationStack();
					choiceOnlyText = choiceOnlyStrVal.value;
				}

				if (choicePoint.hasStartContent) {
		//			var startStrVal = state.PopEvaluationStack () as StringValue;
					var startStrVal = this.state.PopEvaluationStack();
					startText = startStrVal.value;
				}

				// Don't create choice if player has already read this content
				if (choicePoint.onceOnly) {
					var visitCount = this.VisitCountForContainer(choicePoint.choiceTarget);
					if (visitCount > 0) {
						showChoice = false;
					}
				}

				var choice = new Choice(choicePoint);
				choice.threadAtGeneration = this.state.callStack.currentThread.Copy();

				// We go through the full process of creating the choice above so
				// that we consume the content for it, since otherwise it'll
				// be shown on the output stream.
				if (!showChoice) {
					return null;
				}

				// Set final text for the choice
				choice.text = startText + choiceOnlyText;

				return choice;
			}
			IsTruthy(obj){
				var truthy = false;
				if (obj instanceof Value) {
					var val = obj;

					if (val instanceof DivertTargetValue) {
						var divTarget = val;
						this.Error("Shouldn't use a divert target (to " + divTarget.targetPath + ") as a conditional value. Did you intend a function call 'likeThis()' or a read count check 'likeThis'? (no arrows)");
						return false;
					}

					return val.isTruthy;
				}
				return truthy;
			}
			PerformLogicAndFlowControl(contentObj){
				if( contentObj == null ) {
					return false;
				}

				// Divert
				if (contentObj instanceof Divert) {
					var currentDivert = contentObj;
					
					if (currentDivert.isConditional) {
						var conditionValue = this.state.PopEvaluationStack();

						// False conditional? Cancel divert
						if (!this.IsTruthy(conditionValue))
							return true;
					}
					
					if (currentDivert.hasVariableTarget) {
						var varName = currentDivert.variableDivertName;

						var varContents = this.state.variablesState.GetVariableWithName(varName);

						if (!(varContents instanceof DivertTargetValue)) {

		//					var intContent = varContents as IntValue;
							var intContent = varContents;

							var errorMessage = "Tried to divert to a target from a variable, but the variable (" + varName + ") didn't contain a divert target, it ";
							if (intContent instanceof IntValue && intContent.value == 0) {
								errorMessage += "was empty/null (the value 0).";
							} else {
								errorMessage += "contained '" + varContents + "'.";
							}

							this.Error(errorMessage);
						}

						var target = varContents;
						this.state.divertedTargetObject = this.ContentAtPath(target.targetPath);

					} else if (currentDivert.isExternal) {
						this.CallExternalFunction(currentDivert.targetPathString, currentDivert.externalArgs);
						return true;
					} else {
						this.state.divertedTargetObject = currentDivert.targetContent;
					}

					if (currentDivert.pushesToStack) {
						this.state.callStack.Push(currentDivert.stackPushType);
					}

					if (this.state.divertedTargetObject == null && !currentDivert.isExternal) {

						// Human readable name available - runtime divert is part of a hard-written divert that to missing content
						if (currentDivert && currentDivert.debugMetadata.sourceName != null) {
							this.Error("Divert target doesn't exist: " + currentDivert.debugMetadata.sourceName);
						} else {
							this.Error("Divert resolution failed: " + currentDivert);
						}
					}

					return true;
				} 

				// Start/end an expression evaluation? Or print out the result?
				else if( contentObj instanceof ControlCommand ) {
					var evalCommand = contentObj;

					switch (evalCommand.commandType) {

					case ControlCommand.CommandType.EvalStart:
						if (this.state.inExpressionEvaluation) console.warn("Already in expression evaluation?");
						this.state.inExpressionEvaluation = true;
						break;

					case ControlCommand.CommandType.EvalEnd:
						if (!this.state.inExpressionEvaluation) console.warn("Not in expression evaluation mode");
						this.state.inExpressionEvaluation = false;
						break;

					case ControlCommand.CommandType.EvalOutput:

						// If the expression turned out to be empty, there may not be anything on the stack
						if (this.state.evaluationStack.length > 0) {

							var output = this.state.PopEvaluationStack();

							// Functions may evaluate to Void, in which case we skip output
							if (output != null && !(output instanceof Void)) {
								// TODO: Should we really always blanket convert to string?
								// It would be okay to have numbers in the output stream the
								// only problem is when exporting text for viewing, it skips over numbers etc.
								var text = new StringValue(output.toString());

								this.state.PushToOutputStream(text);
							}

						}
						break;

					case ControlCommand.CommandType.NoOp:
						break;

					case ControlCommand.CommandType.Duplicate:
						this.state.PushEvaluationStack(this.state.PeekEvaluationStack());
						break;

					case ControlCommand.CommandType.PopEvaluatedValue:
						this.state.PopEvaluationStack();
						break;

					case ControlCommand.CommandType.PopFunction:
					case ControlCommand.CommandType.PopTunnel:

						var popType = evalCommand.commandType == ControlCommand.CommandType.PopFunction ?
							PushPopType.Function : PushPopType.Tunnel;
							
						var overrideTunnelReturnTarget = null;
						if (popType == PushPopType.Tunnel) {
							var popped = this.state.PopEvaluationStack();
		//					overrideTunnelReturnTarget = popped as DivertTargetValue;
							overrideTunnelReturnTarget = popped;
							if (overrideTunnelReturnTarget instanceof DivertTargetValue === false) {
								if (popped instanceof Void === false){
									throw "Expected void if ->-> doesn't override target";
								} else {
									overrideTunnelReturnTarget = null;
								}
							}
						}

						if (this.state.TryExitExternalFunctionEvaluation()){
							break;
						}
						else if (this.state.callStack.currentElement.type != popType || !this.state.callStack.canPop) {

							var names = {};
							names[PushPopType.Function] = "function return statement (~ return)";
							names[PushPopType.Tunnel] = "tunnel onwards statement (->->)";

							var expected = names[this.state.callStack.currentElement.type];
							if (!this.state.callStack.canPop)
								expected = "end of flow (-> END or choice)";

							var errorMsg = "Found " + names[popType] + ", when expected " + expected;

							this.Error(errorMsg);
						} 

						else {
							this.state.callStack.Pop();
							
							if (overrideTunnelReturnTarget)
								this.state.divertedTargetObject = this.ContentAtPath(overrideTunnelReturnTarget.targetPath);
						}
						break;

					case ControlCommand.CommandType.BeginString:
						this.state.PushToOutputStream(evalCommand);

						if (!this.state.inExpressionEvaluation) console.warn("Expected to be in an expression when evaluating a string");
						this.state.inExpressionEvaluation = false;
						break;

					case ControlCommand.CommandType.EndString:

						var contentStackForString = [];

						var outputCountConsumed = 0;
						for (var i = this.state.outputStream.length - 1; i >= 0; --i) {
							var obj = this.state.outputStream[i];

							outputCountConsumed++;

		//					var command = obj as ControlCommand;
							var command = obj;
							if (command instanceof ControlCommand && command.commandType == ControlCommand.CommandType.BeginString) {
								break;
							}

							if( obj instanceof StringValue )
								contentStackForString.push(obj);
						}

						// Consume the content that was produced for this string
						this.state.outputStream.splice(this.state.outputStream.length - outputCountConsumed, outputCountConsumed);

						//the C# version uses a Stack for contentStackForString, but we're using a simple array, so we need to reverse it before using it
						contentStackForString = contentStackForString.reverse();
							
						// Build string out of the content we collected
						var sb = new StringBuilder();
						contentStackForString.forEach(c => {
							sb.Append(c.toString());
						});

						// Return to expression evaluation (from content mode)
						this.state.inExpressionEvaluation = true;
						this.state.PushEvaluationStack(new StringValue(sb.toString()));
						break;

					case ControlCommand.CommandType.ChoiceCount:
						var choiceCount = this.state.generatedChoices.length;
						this.state.PushEvaluationStack(new IntValue(choiceCount));
						break;

					case ControlCommand.CommandType.TurnsSince:
					case ControlCommand.CommandType.ReadCount:
						var target = this.state.PopEvaluationStack();
						if( !(target instanceof DivertTargetValue) ) {
							var extraNote = "";
							if( target instanceof IntValue )
								extraNote = ". Did you accidentally pass a read count ('knot_name') instead of a target ('-> knot_name')?";
							this.Error("TURNS_SINCE / READ_COUNT expected a divert target (knot, stitch, label name), but saw "+target+extraNote);
							break;
						}

		//				var divertTarget = target as DivertTargetValue;
						var divertTarget = target;
		//				var container = ContentAtPath (divertTarget.targetPath) as Container;
						var container = this.ContentAtPath(divertTarget.targetPath);

						var eitherCount; 
						if (evalCommand.commandType == ControlCommand.CommandType.TurnsSince)
							eitherCount = this.TurnsSinceForContainer(container);
						else
							eitherCount = this.VisitCountForContainer(container);

						this.state.PushEvaluationStack(new IntValue(eitherCount));
						break;

					case ControlCommand.CommandType.Random:
						var maxInt = this.state.PopEvaluationStack();
						var minInt = this.state.PopEvaluationStack();

						if (minInt == null || minInt instanceof IntValue === false)
							this.Error("Invalid value for minimum parameter of RANDOM(min, max)");

						if (maxInt == null || minInt instanceof IntValue === false)
							this.Error("Invalid value for maximum parameter of RANDOM(min, max)");

						// +1 because it's inclusive of min and max, for e.g. RANDOM(1,6) for a dice roll.
						var randomRange = maxInt.value - minInt.value + 1;
						if (randomRange <= 0)
							this.Error("RANDOM was called with minimum as " + minInt.value + " and maximum as " + maxInt.value + ". The maximum must be larger");

						var resultSeed = this.state.storySeed + this.state.previousRandom;
						var random = new PRNG(resultSeed);

						var nextRandom = random.next();
						var chosenValue = (nextRandom % randomRange) + minInt.value;
						this.state.PushEvaluationStack(new IntValue(chosenValue));

						// Next random number (rather than keeping the Random object around)
						this.state.previousRandom = nextRandom;
						break;
							
					case ControlCommand.CommandType.SeedRandom:
						var seed = this.state.PopEvaluationStack();
						if (seed == null || seed instanceof IntValue === false)
							this.Error("Invalid value passed to SEED_RANDOM");

						// Story seed affects both RANDOM and shuffle behaviour
						this.state.storySeed = seed.value;
						this.state.previousRandom = 0;

						// SEED_RANDOM returns nothing.
						this.state.PushEvaluationStack(new Void());
						break;
							
					case ControlCommand.CommandType.VisitIndex:
						var count = this.VisitCountForContainer(this.state.currentContainer) - 1; // index not count
						this.state.PushEvaluationStack(new IntValue(count));
						break;

					case ControlCommand.CommandType.SequenceShuffleIndex:
						var shuffleIndex = this.NextSequenceShuffleIndex();
						this.state.PushEvaluationStack(new IntValue(shuffleIndex));
						break;

					case ControlCommand.CommandType.StartThread:
						// Handled in main step function
						break;

					case ControlCommand.CommandType.Done:

						// We may exist in the context of the initial
						// act of creating the thread, or in the context of
						// evaluating the content.
						if (this.state.callStack.canPopThread) {
							this.state.callStack.PopThread();
						} 

						// In normal flow - allow safe exit without warning
						else {
							this.state.didSafeExit = true;
							
							// Stop flow in current thread
							this.state.currentContentObject = null;
						}

						break;

					// Force flow to end completely
					case ControlCommand.CommandType.End:
						this.state.ForceEnd();
						break;
							
					case ControlCommand.CommandType.ListFromInt:
		//				var intVal = state.PopEvaluationStack () as IntValue;
						var intVal = parseInt(this.state.PopEvaluationStack());
		//				var listNameVal = state.PopEvaluationStack () as StringValue;
						var listNameVal = this.state.PopEvaluationStack().toString();

						var generatedListValue = null;

						var foundListDef;
						if (foundListDef = this.listDefinitions.TryGetDefinition(listNameVal, foundListDef)) {
							var foundItem = foundListDef.TryGetItemWithValue(intVal.value);
							if (foundItem.exists) {
								generatedListValue = new ListValue(foundItem.item, intVal.value);
							}
						} else {
							throw new StoryException("Failed to find LIST called " + listNameVal.value);
						}

						if (generatedListValue == null)
							generatedListValue = new ListValue();

						this.state.PushEvaluationStack(generatedListValue);
						break;
							
					case ControlCommand.CommandType.ListRange:
						var max = this.state.PopEvaluationStack();
						var min = this.state.PopEvaluationStack();

		//				var targetList = state.PopEvaluationStack () as ListValue;
						var targetList = this.state.PopEvaluationStack();

						if (targetList instanceof ListValue === false || targetList == null || min == null || max == null)
							throw new StoryException("Expected list, minimum and maximum for LIST_RANGE");

						// Allow either int or a particular list item to be passed for the bounds,
						// so wrap up a function to handle this casting for us.
						var IntBound = function IntBound(obj){
		//					var listValue = obj as ListValue;
							var listValue = obj;
							if (listValue instanceof ListValue) {
								return parseInt(listValue.value.maxItem.Value);
							}

		//					var intValue = obj as IntValue;
							var intValue = obj;
							if (intValue instanceof IntValue) {
								return intValue.value;
							}

							return -1;
						};

						var minVal = IntBound(min);
						var maxVal = IntBound(max);
						if (minVal == -1)
							throw new StoryException("Invalid min range bound passed to LIST_VALUE(): " + min);

						if (maxVal == -1)
							throw new StoryException("Invalid max range bound passed to LIST_VALUE(): " + max);

						// Extract the range of items from the origin list
						var result = new ListValue();
						var origins = targetList.value.origins;

						if (origins != null) {
							origins.forEach(function(origin){
								var rangeFromOrigin = origin.ListRange(minVal, maxVal);
								rangeFromOrigin.value.forEach(function(kv){
									result.value.Add(kv.Key, kv.Value);
								});
							});
						}

						this.state.PushEvaluationStack(result);
						break;

					default:
						this.Error("unhandled ControlCommand: " + evalCommand);
						break;
					}

					return true;
				}

				// Variable assignment
				else if( contentObj instanceof VariableAssignment ) {
					var varAss = contentObj;
					var assignedVal = this.state.PopEvaluationStack();
					
					// When in temporary evaluation, don't create new variables purely within
					// the temporary context, but attempt to create them globally
					//var prioritiseHigherInCallStack = _temporaryEvaluationContainer != null;

					this.state.variablesState.Assign(varAss, assignedVal);

					return true;
				}

				// Variable reference
				else if( contentObj instanceof VariableReference ) {
					var varRef = contentObj;
					var foundValue = null;


					// Explicit read count value
					if (varRef.pathForCount != null) {

						var container = varRef.containerForCount;
						var count = this.VisitCountForContainer(container);
						foundValue = new IntValue(count);
					}

					// Normal variable reference
					else {

						foundValue = this.state.variablesState.GetVariableWithName(varRef.name);

						if (foundValue == null) {
							this.Error("Uninitialised variable: " + varRef.name);
							foundValue = new IntValue(0);
						}
					}

					this.state.PushEvaluationStack(foundValue);

					return true;
				}

				// Native function call
				else if (contentObj instanceof NativeFunctionCall) {
					var func = contentObj;
					var funcParams = this.state.PopEvaluationStack(func.numberOfParameters);
					var result = func.Call(funcParams);
					this.state.PushEvaluationStack(result);
					return true;
				}

				// No control content, must be ordinary content
				return false;
			}
			ChoosePathString(path, args){
				args = args || [];
				this.state.PassArgumentsToEvaluationStack(args);
				this.ChoosePath(new Path$1(path));
			}
			ChoosePath(p){
				this.state.SetChosenPath(p);

				// Take a note of newly visited containers for read counts etc
				this.VisitChangedContainersDueToDivert();
			}
			ChooseChoiceIndex(choiceIdx){
				choiceIdx = choiceIdx;
				var choices = this.currentChoices;
				if (choiceIdx < 0 || choiceIdx > choices.length) console.warn("choice out of range");

				// Replace callstack with the one from the thread at the choosing point, 
				// so that we can jump into the right place in the flow.
				// This is important in case the flow was forked by a new thread, which
				// can create multiple leading edges for the story, each of
				// which has its own context.
				var choiceToChoose = choices[choiceIdx];
				this.state.callStack.currentThread = choiceToChoose.threadAtGeneration;

				this.ChoosePath(choiceToChoose.choicePoint.choiceTarget.path);
			}
			HasFunction(functionName){
				try {
					return this.ContentAtPath(new Path$1(functionName)) instanceof Container;
				} catch(e) {
					return false;
				}
			}
			EvaluateFunction(functionName, args, returnTextOutput){
				//EvaluateFunction behaves slightly differently than the C# version. In C#, you can pass a (second) parameter `out textOutput` to get the text outputted by the function. This is not possible in js. Instead, we maintain the regular signature (functionName, args), plus an optional third parameter returnTextOutput. If set to true, we will return both the textOutput and the returned value, as an object.
				returnTextOutput = !!returnTextOutput;
				
				if (functionName == null) {
					throw "Function is null";
				} 
				else if (functionName == '' || functionName.trim() == '') {
					throw "Function is empty or white space.";
				}

				var funcContainer = null;
				try {
					funcContainer = this.ContentAtPath(new Path$1(functionName));
				} catch (e) {
					if (e.message.indexOf("not found") >= 0)
						throw "Function doesn't exist: '" + functionName + "'";
					else
						throw e;
				}
				
				this.state.StartExternalFunctionEvaluation(funcContainer, args);
				
				// Evaluate the function, and collect the string output
				var stringOutput = new StringBuilder();
				while (this.canContinue) {
					stringOutput.Append(this.Continue());
				}
				var textOutput = stringOutput.toString();
				
				var result = this.state.CompleteExternalFunctionEvaluation();

				return (returnTextOutput) ? {'returned': result, 'output': textOutput} : result;
			}
			EvaluateExpression(exprContainer){
				var startCallStackHeight = this.state.callStack.elements.length;

				this.state.callStack.Push(PushPopType.Tunnel);

				this._temporaryEvaluationContainer = exprContainer;

				this.state.GoToStart();

				var evalStackHeight = this.state.evaluationStack.length;

				this.Continue();

				this._temporaryEvaluationContainer = null;

				// Should have fallen off the end of the Container, which should
				// have auto-popped, but just in case we didn't for some reason,
				// manually pop to restore the state (including currentPath).
				if (this.state.callStack.elements.length > startCallStackHeight) {
					this.state.callStack.Pop();
				}

				var endStackHeight = this.state.evaluationStack.length;
				if (endStackHeight > evalStackHeight) {
					return this.state.PopEvaluationStack();
				} else {
					return null;
				}
			}
			CallExternalFunction(funcName, numberOfArguments){
				var func = this._externals[funcName];
				var fallbackFunctionContainer = null;

				var foundExternal = typeof func !== 'undefined';

				// Try to use fallback function?
				if (!foundExternal) {
					if (this.allowExternalFunctionFallbacks) {
		//				fallbackFunctionContainer = ContentAtPath (new Path (funcName)) as Container;
						fallbackFunctionContainer = this.ContentAtPath(new Path$1(funcName));
						if (!(fallbackFunctionContainer instanceof Container)) console.warn("Trying to call EXTERNAL function '" + funcName + "' which has not been bound, and fallback ink function could not be found.");

						// Divert direct into fallback function and we're done
						this.state.callStack.Push(PushPopType.Function);
						this.state.divertedTargetObject = fallbackFunctionContainer;
						return;

					} else {
						console.warn("Trying to call EXTERNAL function '" + funcName + "' which has not been bound (and ink fallbacks disabled).");
					}
				}

				// Pop arguments
				var args = [];
				for (var i = 0; i < numberOfArguments; ++i) {
		//			var poppedObj = state.PopEvaluationStack () as Value;
					var poppedObj = this.state.PopEvaluationStack();
					var valueObj = poppedObj.valueObject;
					args.push(valueObj);
				}

				// Reverse arguments from the order they were popped,
				// so they're the right way round again.
				args.reverse();

				// Run the function!
				var funcResult = func(args);

				// Convert return value (if any) to the a type that the ink engine can use
				var returnObj = null;
				if (funcResult != null) {
					returnObj = Value.Create(funcResult);
					if (returnObj == null) console.warn("Could not create ink value from returned object of type " + (typeof funcResult));
				} else {
					returnObj = new Void();
				}

				this.state.PushEvaluationStack(returnObj);
			}
			TryCoerce(value){
				//we're skipping type coercition in this implementation. First of, js is loosely typed, so it's not that important. Secondly, there is no clean way (AFAIK) for the user to describe what type of parameters he/she expects.
				return value;
			}
			BindExternalFunctionGeneral(funcName, func){
				if (this._externals[funcName]) console.warn("Function '" + funcName + "' has already been bound.");
				this._externals[funcName] = func;
			}
			BindExternalFunction(funcName, func){
				if (!func) console.warn("Can't bind a null function");

				this.BindExternalFunctionGeneral(funcName, (args) => {
					if (args.length < func.length) console.warn("External function expected " + func.length + " arguments");
					
					var coercedArgs = [];
					for (var i = 0, l = args.length; i < l; i++){
						coercedArgs[i] = this.TryCoerce(args[i]);
					}
					return func.apply(null, coercedArgs);
				});
			}
			UnbindExternalFunction(funcName){
				if (typeof this._externals[funcName] === 'undefined') console.warn("Function '" + funcName + "' has not been bound.");
				delete this._externals[funcName];
			}
			ValidateExternalBindings(containerOrObject, missingExternals){
				if (!containerOrObject){
					var missingExternals = [];
					this.ValidateExternalBindings(this._mainContentContainer, missingExternals);
		            this._hasValidatedExternals = true;
					
					// No problem! Validation complete
					if( missingExternals.length == 0 ) {
						this._hasValidatedExternals = true;
					} 

					// Error for all missing externals
					else {
						var message = "Error: Missing function binding for external";
						message += (missingExternals.length > 1) ? "s" : "";
						message += ": '";
						message += missingExternals.join("', '");
						message += "' ";
						message += (this.allowExternalFunctionFallbacks) ? ", and no fallback ink function found." : " (ink fallbacks disabled)";

						this.Error(message);
					}
				}
				else if (containerOrObject instanceof Container){
					var c = containerOrObject;
					
					c.content.forEach(innerContent => {
						this.ValidateExternalBindings(innerContent, missingExternals);
					});
					for (var key in c.namedContent){
						this.ValidateExternalBindings(c.namedContent[key], missingExternals);
					}
				}
				else{
					var o = containerOrObject;
					//the following code is already taken care of above in this implementation
		//			var container = o as Container;
		//            if (container) {
		//                ValidateExternalBindings (container, missingExternals);
		//                return;
		//            }

		//            var divert = o as Divert;
		            var divert = o;
		            if (divert instanceof Divert && divert.isExternal) {
		                var name = divert.targetPathString;

		                if (!this._externals[name]) {
							if( this.allowExternalFunctionFallbacks ) {
								var fallbackFound = !!this.mainContentContainer.namedContent[name];
								if( !fallbackFound ) {
									missingExternals.push(name);
								}
							} else {
								missingExternals.push(name);
							}
		                }
		            }
				}
			}
			ObserveVariable(variableName, observer){
				if (this._variableObservers == null)
					this._variableObservers = {};

				if (this._variableObservers[variableName]) {
					this._variableObservers[variableName].push(observer);
				} else {
					this._variableObservers[variableName] = [observer];
				}
			}
			ObserveVariables(variableNames, observers){
				for (var i = 0, l = variableNames.length; i < l; i++){
					this.ObserveVariable(variableNames[i], observers[i]);
				}
			}
			RemoveVariableObserver(observer, specificVariableName){
				if (this._variableObservers == null)
					return;

				// Remove observer for this specific variable
				if (typeof specificVariableName !== 'undefined') {
					if (this._variableObservers[specificVariableName]) {
						this._variableObservers[specificVariableName].splice(this._variableObservers[specificVariableName].indexOf(observer), 1);
					}
				} 

				// Remove observer for all variables
				else {
					for (var varName in this._variableObservers){
						this._variableObservers[varName].splice(this._variableObservers[varName].indexOf(observer), 1);
					}
				}
			}
			VariableStateDidChangeEvent(variableName, newValueObj){
				if (this._variableObservers == null)
					return;
				
				var observers = this._variableObservers[variableName];
				if (typeof observers !== 'undefined') {

					if (!(newValueObj instanceof Value)) {
						throw "Tried to get the value of a variable that isn't a standard type";
					}
		//			var val = newValueObj as Value;
					var val = newValueObj;

					observers.forEach(function(observer){
						observer(variableName, val.valueObject);
					});
				}
			}
			TagsForContentAtPath(path){
				return this.TagsAtStartOfFlowContainerWithPathString(path);
			}
			TagsAtStartOfFlowContainerWithPathString(pathString){
				var path = new Path$1(pathString);

				// Expected to be global story, knot or stitch
		//		var flowContainer = ContentAtPath (path) as Container;
				var flowContainer = this.ContentAtPath(path);
				while(true) {
					var firstContent = flowContainer.content[0];
					if (firstContent instanceof Container)
						flowContainer = firstContent;
					else break;
				}
				

				// Any initial tag objects count as the "main tags" associated with that story/knot/stitch
				var tags = null;
				
				flowContainer.content.every(c => {
		//			var tag = c as Runtime.Tag;
					var tag = c;
					if (tag instanceof Tag) {
						if (tags == null) tags = [];
						tags.push(tag.text);
						return true;
					} else return false;
				});

				return tags;
			}
			BuildStringOfHierarchy(){
				var sb = new StringBuilder();

				this.mainContentContainer.BuildStringOfHierarchy(sb, 0, this.state.currentContentObject);

		    return sb.toString();
			}
			BuildStringOfContainer(container){
				var sb = new StringBuilder();
				container.BuildStringOfHierarchy(sb, 0, this.state.currentContentObject);
				return sb.toString();
			}
			NextContent(){
				// Setting previousContentObject is critical for VisitChangedContainersDueToDivert
				this.state.previousContentObject = this.state.currentContentObject;
				
				// Divert step?
				if (this.state.divertedTargetObject != null) {

					this.state.currentContentObject = this.state.divertedTargetObject;
					this.state.divertedTargetObject = null;

					// Internally uses state.previousContentObject and state.currentContentObject
					this.VisitChangedContainersDueToDivert();

					// Diverted location has valid content?
					if (this.state.currentContentObject != null) {
						return;
					}

					// Otherwise, if diverted location doesn't have valid content,
					// drop down and attempt to increment.
					// This can happen if the diverted path is intentionally jumping
					// to the end of a container - e.g. a Conditional that's re-joining
				}

				var successfulPointerIncrement = this.IncrementContentPointer();

				// Ran out of content? Try to auto-exit from a function,
				// or finish evaluating the content of a thread
				if (!successfulPointerIncrement) {

					var didPop = false;

					if (this.state.callStack.CanPop(PushPopType.Function)) {

						// Pop from the call stack
						this.state.callStack.Pop(PushPopType.Function);

						// This pop was due to dropping off the end of a function that didn't return anything,
						// so in this case, we make sure that the evaluator has something to chomp on if it needs it
						if (this.state.inExpressionEvaluation) {
							this.state.PushEvaluationStack(new Void());
						}

						didPop = true;
					} 

					else if (this.state.callStack.canPopThread) {
						this.state.callStack.PopThread();

						didPop = true;
					}
					else {
						this.state.TryExitExternalFunctionEvaluation();
					}

					// Step past the point where we last called out
					if (didPop && this.state.currentContentObject != null) {
						this.NextContent();
					}
				}
			}
			IncrementContentPointer(){
				var successfulIncrement = true;

				var currEl = this.state.callStack.currentElement;
				currEl.currentContentIndex++;

				// Each time we step off the end, we fall out to the next container, all the
				// while we're in indexed rather than named content
				while (currEl.currentContentIndex >= currEl.currentContainer.content.length) {

					successfulIncrement = false;

		//			Container nextAncestor = currEl.currentContainer.parent as Container;
					var nextAncestor = currEl.currentContainer.parent;
					if (nextAncestor instanceof Container === false) {
						break;
					}

					var indexInAncestor = nextAncestor.content.indexOf(currEl.currentContainer);
					if (indexInAncestor == -1) {
						break;
					}

					currEl.currentContainer = nextAncestor;
					currEl.currentContentIndex = indexInAncestor + 1;

					successfulIncrement = true;
				}

				if (!successfulIncrement)
					currEl.currentContainer = null;

				return successfulIncrement;
			}
			TryFollowDefaultInvisibleChoice(){
				var allChoices = this._state.currentChoices;

				// Is a default invisible choice the ONLY choice?
				var invisibleChoices = allChoices.filter(c => {
					return c.choicePoint.isInvisibleDefault;
				});
				if (invisibleChoices.length == 0 || allChoices.length > invisibleChoices.length)
					return false;

				var choice = invisibleChoices[0];

				this.ChoosePath(choice.choicePoint.choiceTarget.path);

				return true;
			}
			VisitCountForContainer(container){
				if( !container.visitsShouldBeCounted ) {
					console.warn("Read count for target ("+container.name+" - on "+container.debugMetadata+") unknown. The story may need to be compiled with countAllVisits flag (-c).");
					return 0;
				}

				var count = 0;
				var containerPathStr = container.path.toString();
				count = this.state.visitCounts[containerPathStr] || count;
				return count;
			}
			IncrementVisitCountForContainer(container){
				var count = 0;
				var containerPathStr = container.path.toString();
				if (this.state.visitCounts[containerPathStr]) count = this.state.visitCounts[containerPathStr];
				count++;
				this.state.visitCounts[containerPathStr] = count;
			}
			RecordTurnIndexVisitToContainer(container){
				var containerPathStr = container.path.toString();
				this.state.turnIndices[containerPathStr] = this.state.currentTurnIndex;
			}
			TurnsSinceForContainer(container){
				if( !container.turnIndexShouldBeCounted ) {
					this.Error("TURNS_SINCE() for target ("+container.name+" - on "+container.debugMetadata+") unknown. The story may need to be compiled with countAllVisits flag (-c).");
				}
				
				var containerPathStr = container.path.toString();
				var index = this.state.turnIndices[containerPathStr];
				if (typeof index !== 'undefined') {
					return this.state.currentTurnIndex - index;
				} else {
					return -1;
				}
			}
			NextSequenceShuffleIndex(){
		//		var numElementsIntVal = state.PopEvaluationStack () as IntValue;
				var numElementsIntVal = this.state.PopEvaluationStack();
				if (!(numElementsIntVal instanceof IntValue)) {
					this.Error("expected number of elements in sequence for shuffle index");
					return 0;
				}

				var seqContainer = this.state.currentContainer;

				var numElements = numElementsIntVal.value;

		//		var seqCountVal = state.PopEvaluationStack () as IntValue;
				var seqCountVal = this.state.PopEvaluationStack();
				var seqCount = seqCountVal.value;
				var loopIndex = seqCount / numElements;
				var iterationIndex = seqCount % numElements;

				// Generate the same shuffle based on:
				//  - The hash of this container, to make sure it's consistent
				//    each time the runtime returns to the sequence
				//  - How many times the runtime has looped around this full shuffle
				var seqPathStr = seqContainer.path.toString();
				var sequenceHash = 0;
				for (var i = 0, l = seqPathStr.length; i < l; i++){
					sequenceHash += seqPathStr.charCodeAt[i] || 0;
				}
				var randomSeed = sequenceHash + loopIndex + this.state.storySeed;
				var random = new PRNG(parseInt(randomSeed));

				var unpickedIndices = [];
				for (var i = 0; i < numElements; ++i) {
					unpickedIndices.push(i);
				}

				for (var i = 0; i <= iterationIndex; ++i) {
					var chosen = random.next() % unpickedIndices.length;
					var chosenIndex = unpickedIndices[chosen];
					unpickedIndices.splice(chosen, 1);

					if (i == iterationIndex) {
						return chosenIndex;
					}
				}

				throw "Should never reach here";
			}
			Error(message, useEndLineNumber){
				var e = new StoryException(message);
		//		e.useEndLineNumber = useEndLineNumber;
				throw e;
			}
			AddError(message, useEndLineNumber){
		//		var dm = this.currentDebugMetadata;
				var dm = null;
				
				if (dm != null) {
					var lineNum = useEndLineNumber ? dm.endLineNumber : dm.startLineNumber;
					message = "RUNTIME ERROR: '" + dm.fileName + "' line " + lineNum + ": " + message;
				}
				else {
					message = "RUNTIME ERROR: " + message;
				}

				this.state.AddError(message);
				
				// In a broken state don't need to know about any other errors.
				this.state.ForceEnd();
			}
		}

		exports.Story = Story;

		Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {(function (global, factory) {
		 true ? module.exports = factory() :
		typeof define === 'function' && define.amd ? define(factory) :
		(global.tippy = factory());
	}(this, (function () { 'use strict';

	var styles = ".tippy-touch{cursor:pointer!important}.tippy-popper{max-width:350px;-webkit-perspective:700px;perspective:700px;z-index:9999;outline:0;-webkit-transition-timing-function:cubic-bezier(.165,.84,.44,1);transition-timing-function:cubic-bezier(.165,.84,.44,1);pointer-events:none}.tippy-popper[data-html]{max-width:96%;max-width:calc(100% - 20px)}.tippy-popper[x-placement^=top] .tippy-backdrop{border-radius:50% 50% 0 0}.tippy-popper[x-placement^=top] .tippy-roundarrow{width:24px;height:24px;fill:#333;bottom:-15px}.tippy-popper[x-placement^=top] .tippy-roundarrow svg{-webkit-transform:rotate(180deg);transform:rotate(180deg)}.tippy-popper[x-placement^=top] .tippy-arrow{border-top:7px solid #333;border-right:7px solid transparent;border-left:7px solid transparent;bottom:-7px;margin:0 9px}.tippy-popper[x-placement^=top] .tippy-backdrop{-webkit-transform-origin:0 33%;transform-origin:0 33%}.tippy-popper[x-placement^=top] .tippy-backdrop[data-state=visible]{-webkit-transform:scale(1) translate(-50%,-60%);transform:scale(1) translate(-50%,-60%);opacity:1}.tippy-popper[x-placement^=top] .tippy-backdrop[data-state=hidden]{-webkit-transform:scale(.25) translate(-50%,-50%);transform:scale(.25) translate(-50%,-50%);opacity:0}.tippy-popper[x-placement^=top] [data-animation=shift-toward][data-state=visible]{opacity:1;-webkit-transform:translateY(-10px);transform:translateY(-10px)}.tippy-popper[x-placement^=top] [data-animation=shift-toward][data-state=hidden]{opacity:0;-webkit-transform:translateY(-20px);transform:translateY(-20px)}.tippy-popper[x-placement^=top] [data-animation=perspective]{-webkit-transform-origin:bottom;transform-origin:bottom}.tippy-popper[x-placement^=top] [data-animation=perspective][data-state=visible]{opacity:1;-webkit-transform:translateY(-10px) rotateX(0);transform:translateY(-10px) rotateX(0)}.tippy-popper[x-placement^=top] [data-animation=perspective][data-state=hidden]{opacity:0;-webkit-transform:translateY(0) rotateX(90deg);transform:translateY(0) rotateX(90deg)}.tippy-popper[x-placement^=top] [data-animation=fade][data-state=visible]{opacity:1;-webkit-transform:translateY(-10px);transform:translateY(-10px)}.tippy-popper[x-placement^=top] [data-animation=fade][data-state=hidden]{opacity:0;-webkit-transform:translateY(-10px);transform:translateY(-10px)}.tippy-popper[x-placement^=top] [data-animation=shift-away][data-state=visible]{opacity:1;-webkit-transform:translateY(-10px);transform:translateY(-10px)}.tippy-popper[x-placement^=top] [data-animation=shift-away][data-state=hidden]{opacity:0;-webkit-transform:translateY(0);transform:translateY(0)}.tippy-popper[x-placement^=top] [data-animation=scale][data-state=visible]{opacity:1;-webkit-transform:translateY(-10px) scale(1);transform:translateY(-10px) scale(1)}.tippy-popper[x-placement^=top] [data-animation=scale][data-state=hidden]{opacity:0;-webkit-transform:translateY(0) scale(0);transform:translateY(0) scale(0)}.tippy-popper[x-placement^=bottom] .tippy-backdrop{border-radius:0 0 50% 50%}.tippy-popper[x-placement^=bottom] .tippy-roundarrow{width:24px;height:24px;fill:#333;top:-15px}.tippy-popper[x-placement^=bottom] .tippy-roundarrow svg{-webkit-transform:rotate(0);transform:rotate(0)}.tippy-popper[x-placement^=bottom] .tippy-arrow{border-bottom:7px solid #333;border-right:7px solid transparent;border-left:7px solid transparent;top:-7px;margin:0 9px}.tippy-popper[x-placement^=bottom] .tippy-backdrop{-webkit-transform-origin:0 -50%;transform-origin:0 -50%}.tippy-popper[x-placement^=bottom] .tippy-backdrop[data-state=visible]{-webkit-transform:scale(1) translate(-50%,-40%);transform:scale(1) translate(-50%,-40%);opacity:1}.tippy-popper[x-placement^=bottom] .tippy-backdrop[data-state=hidden]{-webkit-transform:scale(.25) translate(-50%);transform:scale(.25) translate(-50%);opacity:0}.tippy-popper[x-placement^=bottom] [data-animation=shift-toward][data-state=visible]{opacity:1;-webkit-transform:translateY(10px);transform:translateY(10px)}.tippy-popper[x-placement^=bottom] [data-animation=shift-toward][data-state=hidden]{opacity:0;-webkit-transform:translateY(20px);transform:translateY(20px)}.tippy-popper[x-placement^=bottom] [data-animation=perspective]{-webkit-transform-origin:top;transform-origin:top}.tippy-popper[x-placement^=bottom] [data-animation=perspective][data-state=visible]{opacity:1;-webkit-transform:translateY(10px) rotateX(0);transform:translateY(10px) rotateX(0)}.tippy-popper[x-placement^=bottom] [data-animation=perspective][data-state=hidden]{opacity:0;-webkit-transform:translateY(0) rotateX(-90deg);transform:translateY(0) rotateX(-90deg)}.tippy-popper[x-placement^=bottom] [data-animation=fade][data-state=visible]{opacity:1;-webkit-transform:translateY(10px);transform:translateY(10px)}.tippy-popper[x-placement^=bottom] [data-animation=fade][data-state=hidden]{opacity:0;-webkit-transform:translateY(10px);transform:translateY(10px)}.tippy-popper[x-placement^=bottom] [data-animation=shift-away][data-state=visible]{opacity:1;-webkit-transform:translateY(10px);transform:translateY(10px)}.tippy-popper[x-placement^=bottom] [data-animation=shift-away][data-state=hidden]{opacity:0;-webkit-transform:translateY(0);transform:translateY(0)}.tippy-popper[x-placement^=bottom] [data-animation=scale][data-state=visible]{opacity:1;-webkit-transform:translateY(10px) scale(1);transform:translateY(10px) scale(1)}.tippy-popper[x-placement^=bottom] [data-animation=scale][data-state=hidden]{opacity:0;-webkit-transform:translateY(0) scale(0);transform:translateY(0) scale(0)}.tippy-popper[x-placement^=left] .tippy-backdrop{border-radius:50% 0 0 50%}.tippy-popper[x-placement^=left] .tippy-roundarrow{width:24px;height:24px;fill:#333;right:-15px}.tippy-popper[x-placement^=left] .tippy-roundarrow svg{-webkit-transform:rotate(90deg);transform:rotate(90deg)}.tippy-popper[x-placement^=left] .tippy-arrow{border-left:7px solid #333;border-top:7px solid transparent;border-bottom:7px solid transparent;right:-7px;margin:6px 0}.tippy-popper[x-placement^=left] .tippy-backdrop{-webkit-transform-origin:50% 0;transform-origin:50% 0}.tippy-popper[x-placement^=left] .tippy-backdrop[data-state=visible]{-webkit-transform:scale(1) translate(-50%,-50%);transform:scale(1) translate(-50%,-50%);opacity:1}.tippy-popper[x-placement^=left] .tippy-backdrop[data-state=hidden]{-webkit-transform:scale(.25) translate(-50%,-50%);transform:scale(.25) translate(-50%,-50%);opacity:0}.tippy-popper[x-placement^=left] [data-animation=shift-toward][data-state=visible]{opacity:1;-webkit-transform:translateX(-10px);transform:translateX(-10px)}.tippy-popper[x-placement^=left] [data-animation=shift-toward][data-state=hidden]{opacity:0;-webkit-transform:translateX(-20px);transform:translateX(-20px)}.tippy-popper[x-placement^=left] [data-animation=perspective]{-webkit-transform-origin:right;transform-origin:right}.tippy-popper[x-placement^=left] [data-animation=perspective][data-state=visible]{opacity:1;-webkit-transform:translateX(-10px) rotateY(0);transform:translateX(-10px) rotateY(0)}.tippy-popper[x-placement^=left] [data-animation=perspective][data-state=hidden]{opacity:0;-webkit-transform:translateX(0) rotateY(-90deg);transform:translateX(0) rotateY(-90deg)}.tippy-popper[x-placement^=left] [data-animation=fade][data-state=visible]{opacity:1;-webkit-transform:translateX(-10px);transform:translateX(-10px)}.tippy-popper[x-placement^=left] [data-animation=fade][data-state=hidden]{opacity:0;-webkit-transform:translateX(-10px);transform:translateX(-10px)}.tippy-popper[x-placement^=left] [data-animation=shift-away][data-state=visible]{opacity:1;-webkit-transform:translateX(-10px);transform:translateX(-10px)}.tippy-popper[x-placement^=left] [data-animation=shift-away][data-state=hidden]{opacity:0;-webkit-transform:translateX(0);transform:translateX(0)}.tippy-popper[x-placement^=left] [data-animation=scale][data-state=visible]{opacity:1;-webkit-transform:translateX(-10px) scale(1);transform:translateX(-10px) scale(1)}.tippy-popper[x-placement^=left] [data-animation=scale][data-state=hidden]{opacity:0;-webkit-transform:translateX(0) scale(0);transform:translateX(0) scale(0)}.tippy-popper[x-placement^=right] .tippy-backdrop{border-radius:0 50% 50% 0}.tippy-popper[x-placement^=right] .tippy-roundarrow{width:24px;height:24px;fill:#333;left:-15px}.tippy-popper[x-placement^=right] .tippy-roundarrow svg{-webkit-transform:rotate(-90deg);transform:rotate(-90deg)}.tippy-popper[x-placement^=right] .tippy-arrow{border-right:7px solid #333;border-top:7px solid transparent;border-bottom:7px solid transparent;left:-7px;margin:6px 0}.tippy-popper[x-placement^=right] .tippy-backdrop{-webkit-transform-origin:-50% 0;transform-origin:-50% 0}.tippy-popper[x-placement^=right] .tippy-backdrop[data-state=visible]{-webkit-transform:scale(1) translate(-50%,-50%);transform:scale(1) translate(-50%,-50%);opacity:1}.tippy-popper[x-placement^=right] .tippy-backdrop[data-state=hidden]{-webkit-transform:scale(.25) translate(-50%,-50%);transform:scale(.25) translate(-50%,-50%);opacity:0}.tippy-popper[x-placement^=right] [data-animation=shift-toward][data-state=visible]{opacity:1;-webkit-transform:translateX(10px);transform:translateX(10px)}.tippy-popper[x-placement^=right] [data-animation=shift-toward][data-state=hidden]{opacity:0;-webkit-transform:translateX(20px);transform:translateX(20px)}.tippy-popper[x-placement^=right] [data-animation=perspective]{-webkit-transform-origin:left;transform-origin:left}.tippy-popper[x-placement^=right] [data-animation=perspective][data-state=visible]{opacity:1;-webkit-transform:translateX(10px) rotateY(0);transform:translateX(10px) rotateY(0)}.tippy-popper[x-placement^=right] [data-animation=perspective][data-state=hidden]{opacity:0;-webkit-transform:translateX(0) rotateY(90deg);transform:translateX(0) rotateY(90deg)}.tippy-popper[x-placement^=right] [data-animation=fade][data-state=visible]{opacity:1;-webkit-transform:translateX(10px);transform:translateX(10px)}.tippy-popper[x-placement^=right] [data-animation=fade][data-state=hidden]{opacity:0;-webkit-transform:translateX(10px);transform:translateX(10px)}.tippy-popper[x-placement^=right] [data-animation=shift-away][data-state=visible]{opacity:1;-webkit-transform:translateX(10px);transform:translateX(10px)}.tippy-popper[x-placement^=right] [data-animation=shift-away][data-state=hidden]{opacity:0;-webkit-transform:translateX(0);transform:translateX(0)}.tippy-popper[x-placement^=right] [data-animation=scale][data-state=visible]{opacity:1;-webkit-transform:translateX(10px) scale(1);transform:translateX(10px) scale(1)}.tippy-popper[x-placement^=right] [data-animation=scale][data-state=hidden]{opacity:0;-webkit-transform:translateX(0) scale(0);transform:translateX(0) scale(0)}.tippy-tooltip{position:relative;color:#fff;border-radius:4px;font-size:.9rem;padding:.3rem .6rem;text-align:center;will-change:transform;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;background-color:#333}.tippy-tooltip[data-size=small]{padding:.2rem .4rem;font-size:.75rem}.tippy-tooltip[data-size=large]{padding:.4rem .8rem;font-size:1rem}.tippy-tooltip[data-animatefill]{overflow:hidden;background-color:transparent}.tippy-tooltip[data-interactive]{pointer-events:auto}.tippy-tooltip[data-inertia]{-webkit-transition-timing-function:cubic-bezier(.53,2,.36,.85);transition-timing-function:cubic-bezier(.53,2,.36,.85)}.tippy-tooltip .tippy-arrow,.tippy-tooltip .tippy-roundarrow{position:absolute;width:0;height:0}.tippy-tooltip .tippy-backdrop{position:absolute;will-change:transform;background-color:#333;border-radius:50%;width:135%;left:50%;top:50%;z-index:-1;overflow:hidden;-webkit-backface-visibility:hidden;backface-visibility:hidden}.tippy-tooltip .tippy-backdrop[data-state=visible]{-webkit-transition:all cubic-bezier(.37,.21,.32,.82);transition:all cubic-bezier(.37,.21,.32,.82)}.tippy-tooltip .tippy-backdrop[data-state=hidden]{-webkit-transition:all cubic-bezier(.4,.5,.5,.99);transition:all cubic-bezier(.4,.5,.5,.99)}.tippy-tooltip .tippy-backdrop:after{content:\"\";float:left;padding-top:90%}@media (max-width:400px){.tippy-popper{max-width:96%;max-width:calc(100% - 20px)}}";

	var isBrowser = typeof window !== 'undefined';

	var browser = {};

	if (isBrowser) {
	  browser.supported = 'requestAnimationFrame' in window;
	  browser.supportsTouch = 'ontouchstart' in window;
	  browser.usingTouch = false;
	  browser.eventsBound = false;
	  browser.dynamicInputDetection = true;
	  browser.iOS = /iPhone|iPad|iPod/.test(navigator.platform) && !window.MSStream;
	}

	/**
	* Selector constants used for grabbing elements
	*/
	var selectors = {
	  POPPER: '.tippy-popper',
	  TOOLTIP: '.tippy-tooltip',
	  CONTENT: '.tippy-content',
	  BACKDROP: '.tippy-backdrop',
	  ARROW: '.tippy-arrow',
	  ROUND_ARROW: '.tippy-roundarrow',
	  REFERENCE: '[data-tippy]'

	  /**
	  * The default options applied to each instance
	  */
	};var defaults = {
	  placement: 'top',
	  trigger: 'mouseenter focus',
	  animation: 'shift-away',
	  html: false,
	  animateFill: true,
	  arrow: false,
	  delay: 0,
	  duration: [350, 300],
	  interactive: false,
	  interactiveBorder: 2,
	  theme: 'dark',
	  size: 'regular',
	  distance: 10,
	  offset: 0,
	  hideOnClick: true,
	  multiple: false,
	  followCursor: false,
	  inertia: false,
	  updateDuration: 350,
	  sticky: false,
	  stickyDuration: 200,
	  appendTo: function appendTo() {
	    return document.body;
	  },
	  zIndex: 9999,
	  touchHold: false,
	  performance: false,
	  dynamicTitle: false,
	  flip: true,
	  flipBehavior: 'flip',
	  arrowType: 'sharp',
	  arrowTransform: '',
	  maxWidth: '',
	  popperOptions: {},
	  createPopperInstanceOnInit: false,
	  onShow: function onShow() {},
	  onShown: function onShown() {},
	  onHide: function onHide() {},
	  onHidden: function onHidden() {}
	};

	/**
	* The keys of the defaults object for reducing down into a new object
	* Used in `getIndividualOptions()`
	*/
	var defaultsKeys = browser.supported && Object.keys(defaults);

	/**
	* Determines if a value is an object literal
	* @param {*} value
	* @return {Boolean}
	*/
	function isObjectLiteral(value) {
	  return Object.prototype.toString.call(value) === '[object Object]';
	}

	/**
	* Returns an array of elements based on the selector input
	* @param {String|Element|Element[]|NodeList|Object} selector
	* @return {Element[]}
	*/
	function getArrayOfElements(selector) {
	  if (selector instanceof Element || isObjectLiteral(selector)) {
	    return [selector];
	  }

	  if (selector instanceof NodeList) {
	    return [].slice.call(selector);
	  }

	  if (Array.isArray(selector)) {
	    return selector;
	  }

	  try {
	    return [].slice.call(document.querySelectorAll(selector));
	  } catch (_) {
	    return [];
	  }
	}

	var classCallCheck = function (instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	};

	var createClass = function () {
	  function defineProperties(target, props) {
	    for (var i = 0; i < props.length; i++) {
	      var descriptor = props[i];
	      descriptor.enumerable = descriptor.enumerable || false;
	      descriptor.configurable = true;
	      if ("value" in descriptor) descriptor.writable = true;
	      Object.defineProperty(target, descriptor.key, descriptor);
	    }
	  }

	  return function (Constructor, protoProps, staticProps) {
	    if (protoProps) defineProperties(Constructor.prototype, protoProps);
	    if (staticProps) defineProperties(Constructor, staticProps);
	    return Constructor;
	  };
	}();







	var _extends = Object.assign || function (target) {
	  for (var i = 1; i < arguments.length; i++) {
	    var source = arguments[i];

	    for (var key in source) {
	      if (Object.prototype.hasOwnProperty.call(source, key)) {
	        target[key] = source[key];
	      }
	    }
	  }

	  return target;
	};

	/**
	* Returns an object of settings to override global settings
	* @param {Element} reference
	* @param {Object} instanceOptions
	* @return {Object} - individual options
	*/
	function getIndividualOptions(reference, instanceOptions) {
	  var options = defaultsKeys.reduce(function (acc, key) {
	    var val = reference.getAttribute('data-tippy-' + key.toLowerCase()) || instanceOptions[key];

	    // Convert strings to booleans
	    if (val === 'false') val = false;
	    if (val === 'true') val = true;

	    // Convert number strings to true numbers
	    if (isFinite(val) && !isNaN(parseFloat(val))) {
	      val = parseFloat(val);
	    }

	    // Convert array strings to actual arrays
	    if (typeof val === 'string' && val.trim().charAt(0) === '[') {
	      val = JSON.parse(val);
	    }

	    acc[key] = val;

	    return acc;
	  }, {});

	  return _extends({}, instanceOptions, options);
	}

	/**
	* Returns the supported prefixed property - only `webkit` is needed, `moz`, `ms` and `o` are obsolete
	* @param {String} property
	* @return {String} - browser supported prefixed property
	*/
	function prefix(property) {
	  var prefixes = [false, 'webkit'];
	  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

	  for (var i = 0; i < prefixes.length; i++) {
	    var _prefix = prefixes[i];
	    var prefixedProp = _prefix ? '' + _prefix + upperProp : property;
	    if (typeof document.body.style[prefixedProp] !== 'undefined') {
	      return prefixedProp;
	    }
	  }

	  return null;
	}

	/**
	* Creates a popper element then returns it
	* @param {Number} id - the popper id
	* @param {String} title - the tooltip's `title` attribute
	* @param {Object} options - individual options
	* @return {Element} - the popper element
	*/
	function createPopperElement(id, title, options) {
	  var placement = options.placement,
	      distance = options.distance,
	      arrow = options.arrow,
	      arrowType = options.arrowType,
	      arrowTransform = options.arrowTransform,
	      animateFill = options.animateFill,
	      inertia = options.inertia,
	      animation = options.animation,
	      size = options.size,
	      theme = options.theme,
	      html = options.html,
	      zIndex = options.zIndex,
	      interactive = options.interactive,
	      maxWidth = options.maxWidth;


	  var popper = document.createElement('div');
	  popper.setAttribute('class', 'tippy-popper');
	  popper.setAttribute('role', 'tooltip');
	  popper.setAttribute('aria-hidden', 'true');
	  popper.setAttribute('id', 'tippy-' + id);
	  popper.style.zIndex = zIndex;
	  popper.style.maxWidth = maxWidth;

	  var tooltip = document.createElement('div');
	  tooltip.setAttribute('class', 'tippy-tooltip');
	  tooltip.setAttribute('data-size', size);
	  tooltip.setAttribute('data-animation', animation);
	  tooltip.setAttribute('data-state', 'hidden');

	  theme.split(' ').forEach(function (t) {
	    tooltip.classList.add(t + '-theme');
	  });

	  if (arrow) {
	    var _arrow = document.createElement('div');
	    _arrow.style[prefix('transform')] = arrowTransform;

	    if (arrowType === 'round') {
	      _arrow.classList.add('tippy-roundarrow');
	      _arrow.innerHTML = '\n      <svg width="100%" height="100%" viewBox="0 0 64 20" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:1.41421;">\n        <g transform="matrix(1.04009,0,0,1.45139,-1.26297,-65.9145)">\n          <path d="M1.214,59.185C1.214,59.185 12.868,59.992 21.5,51.55C29.887,43.347 33.898,43.308 42.5,51.55C51.352,60.031 62.747,59.185 62.747,59.185L1.214,59.185Z"/>\n        </g>\n      </svg>';
	    } else {
	      _arrow.classList.add('tippy-arrow');
	    }

	    tooltip.appendChild(_arrow);
	  }

	  if (animateFill) {
	    // Create animateFill circle element for animation
	    tooltip.setAttribute('data-animatefill', '');
	    var circle = document.createElement('div');
	    circle.setAttribute('data-state', 'hidden');
	    circle.classList.add('tippy-backdrop');
	    tooltip.appendChild(circle);
	  }

	  if (inertia) {
	    // Change transition timing function cubic bezier
	    tooltip.setAttribute('data-inertia', '');
	  }

	  if (interactive) {
	    tooltip.setAttribute('data-interactive', '');
	  }

	  var content = document.createElement('div');
	  content.setAttribute('class', 'tippy-content');

	  if (html) {
	    var templateId = void 0;

	    if (html instanceof Element) {
	      content.appendChild(html);
	      templateId = '#' + html.id || 'tippy-html-template';
	    } else {
	      content.innerHTML = document.querySelector(html).innerHTML;
	      templateId = html;
	    }

	    popper.setAttribute('data-html', '');
	    interactive && popper.setAttribute('tabindex', '-1');
	    tooltip.setAttribute('data-template-id', templateId);
	  } else {
	    content.innerHTML = title;
	  }

	  tooltip.appendChild(content);
	  popper.appendChild(tooltip);

	  return popper;
	}

	/**!
	 * @fileOverview Kickass library to create and place poppers near their reference elements.
	 * @version 1.12.9
	 * @license
	 * Copyright (c) 2016 Federico Zivolo and contributors
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in all
	 * copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	 * SOFTWARE.
	 */
	var isBrowser$1 = typeof window !== 'undefined' && typeof document !== 'undefined';
	var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
	var timeoutDuration = 0;
	for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
	  if (isBrowser$1 && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
	    timeoutDuration = 1;
	    break;
	  }
	}

	function microtaskDebounce(fn) {
	  var called = false;
	  return function () {
	    if (called) {
	      return;
	    }
	    called = true;
	    window.Promise.resolve().then(function () {
	      called = false;
	      fn();
	    });
	  };
	}

	function taskDebounce(fn) {
	  var scheduled = false;
	  return function () {
	    if (!scheduled) {
	      scheduled = true;
	      setTimeout(function () {
	        scheduled = false;
	        fn();
	      }, timeoutDuration);
	    }
	  };
	}

	var supportsMicroTasks = isBrowser$1 && window.Promise;

	/**
	* Create a debounced version of a method, that's asynchronously deferred
	* but called in the minimum time possible.
	*
	* @method
	* @memberof Popper.Utils
	* @argument {Function} fn
	* @returns {Function}
	*/
	var debounce = supportsMicroTasks ? microtaskDebounce : taskDebounce;

	/**
	 * Check if the given variable is a function
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Any} functionToCheck - variable to check
	 * @returns {Boolean} answer to: is a function?
	 */
	function isFunction(functionToCheck) {
	  var getType = {};
	  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
	}

	/**
	 * Get CSS computed property of the given element
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Eement} element
	 * @argument {String} property
	 */
	function getStyleComputedProperty(element, property) {
	  if (element.nodeType !== 1) {
	    return [];
	  }
	  // NOTE: 1 DOM access here
	  var css = getComputedStyle(element, null);
	  return property ? css[property] : css;
	}

	/**
	 * Returns the parentNode or the host of the element
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element
	 * @returns {Element} parent
	 */
	function getParentNode(element) {
	  if (element.nodeName === 'HTML') {
	    return element;
	  }
	  return element.parentNode || element.host;
	}

	/**
	 * Returns the scrolling parent of the given element
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element
	 * @returns {Element} scroll parent
	 */
	function getScrollParent(element) {
	  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
	  if (!element) {
	    return document.body;
	  }

	  switch (element.nodeName) {
	    case 'HTML':
	    case 'BODY':
	      return element.ownerDocument.body;
	    case '#document':
	      return element.body;
	  }

	  // Firefox want us to check `-x` and `-y` variations as well

	  var _getStyleComputedProp = getStyleComputedProperty(element),
	      overflow = _getStyleComputedProp.overflow,
	      overflowX = _getStyleComputedProp.overflowX,
	      overflowY = _getStyleComputedProp.overflowY;

	  if (/(auto|scroll)/.test(overflow + overflowY + overflowX)) {
	    return element;
	  }

	  return getScrollParent(getParentNode(element));
	}

	/**
	 * Returns the offset parent of the given element
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element
	 * @returns {Element} offset parent
	 */
	function getOffsetParent(element) {
	  // NOTE: 1 DOM access here
	  var offsetParent = element && element.offsetParent;
	  var nodeName = offsetParent && offsetParent.nodeName;

	  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
	    if (element) {
	      return element.ownerDocument.documentElement;
	    }

	    return document.documentElement;
	  }

	  // .offsetParent will return the closest TD or TABLE in case
	  // no offsetParent is present, I hate this job...
	  if (['TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, 'position') === 'static') {
	    return getOffsetParent(offsetParent);
	  }

	  return offsetParent;
	}

	function isOffsetContainer(element) {
	  var nodeName = element.nodeName;

	  if (nodeName === 'BODY') {
	    return false;
	  }
	  return nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element;
	}

	/**
	 * Finds the root node (document, shadowDOM root) of the given element
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} node
	 * @returns {Element} root node
	 */
	function getRoot(node) {
	  if (node.parentNode !== null) {
	    return getRoot(node.parentNode);
	  }

	  return node;
	}

	/**
	 * Finds the offset parent common to the two provided nodes
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element1
	 * @argument {Element} element2
	 * @returns {Element} common offset parent
	 */
	function findCommonOffsetParent(element1, element2) {
	  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
	  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
	    return document.documentElement;
	  }

	  // Here we make sure to give as "start" the element that comes first in the DOM
	  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
	  var start = order ? element1 : element2;
	  var end = order ? element2 : element1;

	  // Get common ancestor container
	  var range = document.createRange();
	  range.setStart(start, 0);
	  range.setEnd(end, 0);
	  var commonAncestorContainer = range.commonAncestorContainer;

	  // Both nodes are inside #document

	  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
	    if (isOffsetContainer(commonAncestorContainer)) {
	      return commonAncestorContainer;
	    }

	    return getOffsetParent(commonAncestorContainer);
	  }

	  // one of the nodes is inside shadowDOM, find which one
	  var element1root = getRoot(element1);
	  if (element1root.host) {
	    return findCommonOffsetParent(element1root.host, element2);
	  } else {
	    return findCommonOffsetParent(element1, getRoot(element2).host);
	  }
	}

	/**
	 * Gets the scroll value of the given element in the given side (top and left)
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element
	 * @argument {String} side `top` or `left`
	 * @returns {number} amount of scrolled pixels
	 */
	function getScroll(element) {
	  var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

	  var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
	  var nodeName = element.nodeName;

	  if (nodeName === 'BODY' || nodeName === 'HTML') {
	    var html = element.ownerDocument.documentElement;
	    var scrollingElement = element.ownerDocument.scrollingElement || html;
	    return scrollingElement[upperSide];
	  }

	  return element[upperSide];
	}

	/*
	 * Sum or subtract the element scroll values (left and top) from a given rect object
	 * @method
	 * @memberof Popper.Utils
	 * @param {Object} rect - Rect object you want to change
	 * @param {HTMLElement} element - The element from the function reads the scroll values
	 * @param {Boolean} subtract - set to true if you want to subtract the scroll values
	 * @return {Object} rect - The modifier rect object
	 */
	function includeScroll(rect, element) {
	  var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	  var scrollTop = getScroll(element, 'top');
	  var scrollLeft = getScroll(element, 'left');
	  var modifier = subtract ? -1 : 1;
	  rect.top += scrollTop * modifier;
	  rect.bottom += scrollTop * modifier;
	  rect.left += scrollLeft * modifier;
	  rect.right += scrollLeft * modifier;
	  return rect;
	}

	/*
	 * Helper to detect borders of a given element
	 * @method
	 * @memberof Popper.Utils
	 * @param {CSSStyleDeclaration} styles
	 * Result of `getStyleComputedProperty` on the given element
	 * @param {String} axis - `x` or `y`
	 * @return {number} borders - The borders size of the given axis
	 */

	function getBordersSize(styles, axis) {
	  var sideA = axis === 'x' ? 'Left' : 'Top';
	  var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

	  return parseFloat(styles['border' + sideA + 'Width'], 10) + parseFloat(styles['border' + sideB + 'Width'], 10);
	}

	/**
	 * Tells if you are running Internet Explorer 10
	 * @method
	 * @memberof Popper.Utils
	 * @returns {Boolean} isIE10
	 */
	var isIE10 = undefined;

	var isIE10$1 = function isIE10$1() {
	  if (isIE10 === undefined) {
	    isIE10 = navigator.appVersion.indexOf('MSIE 10') !== -1;
	  }
	  return isIE10;
	};

	function getSize(axis, body, html, computedStyle) {
	  return Math.max(body['offset' + axis], body['scroll' + axis], html['client' + axis], html['offset' + axis], html['scroll' + axis], isIE10$1() ? html['offset' + axis] + computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')] + computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')] : 0);
	}

	function getWindowSizes() {
	  var body = document.body;
	  var html = document.documentElement;
	  var computedStyle = isIE10$1() && getComputedStyle(html);

	  return {
	    height: getSize('Height', body, html, computedStyle),
	    width: getSize('Width', body, html, computedStyle)
	  };
	}

	var classCallCheck$1 = function classCallCheck(instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	};

	var createClass$1 = function () {
	  function defineProperties(target, props) {
	    for (var i = 0; i < props.length; i++) {
	      var descriptor = props[i];
	      descriptor.enumerable = descriptor.enumerable || false;
	      descriptor.configurable = true;
	      if ("value" in descriptor) descriptor.writable = true;
	      Object.defineProperty(target, descriptor.key, descriptor);
	    }
	  }

	  return function (Constructor, protoProps, staticProps) {
	    if (protoProps) defineProperties(Constructor.prototype, protoProps);
	    if (staticProps) defineProperties(Constructor, staticProps);
	    return Constructor;
	  };
	}();

	var defineProperty$1 = function defineProperty(obj, key, value) {
	  if (key in obj) {
	    Object.defineProperty(obj, key, {
	      value: value,
	      enumerable: true,
	      configurable: true,
	      writable: true
	    });
	  } else {
	    obj[key] = value;
	  }

	  return obj;
	};

	var _extends$1 = Object.assign || function (target) {
	  for (var i = 1; i < arguments.length; i++) {
	    var source = arguments[i];

	    for (var key in source) {
	      if (Object.prototype.hasOwnProperty.call(source, key)) {
	        target[key] = source[key];
	      }
	    }
	  }

	  return target;
	};

	/**
	 * Given element offsets, generate an output similar to getBoundingClientRect
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Object} offsets
	 * @returns {Object} ClientRect like output
	 */
	function getClientRect(offsets) {
	  return _extends$1({}, offsets, {
	    right: offsets.left + offsets.width,
	    bottom: offsets.top + offsets.height
	  });
	}

	/**
	 * Get bounding client rect of given element
	 * @method
	 * @memberof Popper.Utils
	 * @param {HTMLElement} element
	 * @return {Object} client rect
	 */
	function getBoundingClientRect(element) {
	  var rect = {};

	  // IE10 10 FIX: Please, don't ask, the element isn't
	  // considered in DOM in some circumstances...
	  // This isn't reproducible in IE10 compatibility mode of IE11
	  if (isIE10$1()) {
	    try {
	      rect = element.getBoundingClientRect();
	      var scrollTop = getScroll(element, 'top');
	      var scrollLeft = getScroll(element, 'left');
	      rect.top += scrollTop;
	      rect.left += scrollLeft;
	      rect.bottom += scrollTop;
	      rect.right += scrollLeft;
	    } catch (err) {}
	  } else {
	    rect = element.getBoundingClientRect();
	  }

	  var result = {
	    left: rect.left,
	    top: rect.top,
	    width: rect.right - rect.left,
	    height: rect.bottom - rect.top
	  };

	  // subtract scrollbar size from sizes
	  var sizes = element.nodeName === 'HTML' ? getWindowSizes() : {};
	  var width = sizes.width || element.clientWidth || result.right - result.left;
	  var height = sizes.height || element.clientHeight || result.bottom - result.top;

	  var horizScrollbar = element.offsetWidth - width;
	  var vertScrollbar = element.offsetHeight - height;

	  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
	  // we make this check conditional for performance reasons
	  if (horizScrollbar || vertScrollbar) {
	    var styles = getStyleComputedProperty(element);
	    horizScrollbar -= getBordersSize(styles, 'x');
	    vertScrollbar -= getBordersSize(styles, 'y');

	    result.width -= horizScrollbar;
	    result.height -= vertScrollbar;
	  }

	  return getClientRect(result);
	}

	function getOffsetRectRelativeToArbitraryNode(children, parent) {
	  var isIE10 = isIE10$1();
	  var isHTML = parent.nodeName === 'HTML';
	  var childrenRect = getBoundingClientRect(children);
	  var parentRect = getBoundingClientRect(parent);
	  var scrollParent = getScrollParent(children);

	  var styles = getStyleComputedProperty(parent);
	  var borderTopWidth = parseFloat(styles.borderTopWidth, 10);
	  var borderLeftWidth = parseFloat(styles.borderLeftWidth, 10);

	  var offsets = getClientRect({
	    top: childrenRect.top - parentRect.top - borderTopWidth,
	    left: childrenRect.left - parentRect.left - borderLeftWidth,
	    width: childrenRect.width,
	    height: childrenRect.height
	  });
	  offsets.marginTop = 0;
	  offsets.marginLeft = 0;

	  // Subtract margins of documentElement in case it's being used as parent
	  // we do this only on HTML because it's the only element that behaves
	  // differently when margins are applied to it. The margins are included in
	  // the box of the documentElement, in the other cases not.
	  if (!isIE10 && isHTML) {
	    var marginTop = parseFloat(styles.marginTop, 10);
	    var marginLeft = parseFloat(styles.marginLeft, 10);

	    offsets.top -= borderTopWidth - marginTop;
	    offsets.bottom -= borderTopWidth - marginTop;
	    offsets.left -= borderLeftWidth - marginLeft;
	    offsets.right -= borderLeftWidth - marginLeft;

	    // Attach marginTop and marginLeft because in some circumstances we may need them
	    offsets.marginTop = marginTop;
	    offsets.marginLeft = marginLeft;
	  }

	  if (isIE10 ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
	    offsets = includeScroll(offsets, parent);
	  }

	  return offsets;
	}

	function getViewportOffsetRectRelativeToArtbitraryNode(element) {
	  var html = element.ownerDocument.documentElement;
	  var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
	  var width = Math.max(html.clientWidth, window.innerWidth || 0);
	  var height = Math.max(html.clientHeight, window.innerHeight || 0);

	  var scrollTop = getScroll(html);
	  var scrollLeft = getScroll(html, 'left');

	  var offset = {
	    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
	    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
	    width: width,
	    height: height
	  };

	  return getClientRect(offset);
	}

	/**
	 * Check if the given element is fixed or is inside a fixed parent
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element
	 * @argument {Element} customContainer
	 * @returns {Boolean} answer to "isFixed?"
	 */
	function isFixed(element) {
	  var nodeName = element.nodeName;
	  if (nodeName === 'BODY' || nodeName === 'HTML') {
	    return false;
	  }
	  if (getStyleComputedProperty(element, 'position') === 'fixed') {
	    return true;
	  }
	  return isFixed(getParentNode(element));
	}

	/**
	 * Computed the boundaries limits and return them
	 * @method
	 * @memberof Popper.Utils
	 * @param {HTMLElement} popper
	 * @param {HTMLElement} reference
	 * @param {number} padding
	 * @param {HTMLElement} boundariesElement - Element used to define the boundaries
	 * @returns {Object} Coordinates of the boundaries
	 */
	function getBoundaries(popper, reference, padding, boundariesElement) {
	  // NOTE: 1 DOM access here
	  var boundaries = { top: 0, left: 0 };
	  var offsetParent = findCommonOffsetParent(popper, reference);

	  // Handle viewport case
	  if (boundariesElement === 'viewport') {
	    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent);
	  } else {
	    // Handle other cases based on DOM element used as boundaries
	    var boundariesNode = void 0;
	    if (boundariesElement === 'scrollParent') {
	      boundariesNode = getScrollParent(getParentNode(reference));
	      if (boundariesNode.nodeName === 'BODY') {
	        boundariesNode = popper.ownerDocument.documentElement;
	      }
	    } else if (boundariesElement === 'window') {
	      boundariesNode = popper.ownerDocument.documentElement;
	    } else {
	      boundariesNode = boundariesElement;
	    }

	    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent);

	    // In case of HTML, we need a different computation
	    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
	      var _getWindowSizes = getWindowSizes(),
	          height = _getWindowSizes.height,
	          width = _getWindowSizes.width;

	      boundaries.top += offsets.top - offsets.marginTop;
	      boundaries.bottom = height + offsets.top;
	      boundaries.left += offsets.left - offsets.marginLeft;
	      boundaries.right = width + offsets.left;
	    } else {
	      // for all the other DOM elements, this one is good
	      boundaries = offsets;
	    }
	  }

	  // Add paddings
	  boundaries.left += padding;
	  boundaries.top += padding;
	  boundaries.right -= padding;
	  boundaries.bottom -= padding;

	  return boundaries;
	}

	function getArea(_ref) {
	  var width = _ref.width,
	      height = _ref.height;

	  return width * height;
	}

	/**
	 * Utility used to transform the `auto` placement to the placement with more
	 * available space.
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Object} data - The data object generated by update method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
	  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

	  if (placement.indexOf('auto') === -1) {
	    return placement;
	  }

	  var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

	  var rects = {
	    top: {
	      width: boundaries.width,
	      height: refRect.top - boundaries.top
	    },
	    right: {
	      width: boundaries.right - refRect.right,
	      height: boundaries.height
	    },
	    bottom: {
	      width: boundaries.width,
	      height: boundaries.bottom - refRect.bottom
	    },
	    left: {
	      width: refRect.left - boundaries.left,
	      height: boundaries.height
	    }
	  };

	  var sortedAreas = Object.keys(rects).map(function (key) {
	    return _extends$1({
	      key: key
	    }, rects[key], {
	      area: getArea(rects[key])
	    });
	  }).sort(function (a, b) {
	    return b.area - a.area;
	  });

	  var filteredAreas = sortedAreas.filter(function (_ref2) {
	    var width = _ref2.width,
	        height = _ref2.height;
	    return width >= popper.clientWidth && height >= popper.clientHeight;
	  });

	  var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

	  var variation = placement.split('-')[1];

	  return computedPlacement + (variation ? '-' + variation : '');
	}

	/**
	 * Get offsets to the reference element
	 * @method
	 * @memberof Popper.Utils
	 * @param {Object} state
	 * @param {Element} popper - the popper element
	 * @param {Element} reference - the reference element (the popper will be relative to this)
	 * @returns {Object} An object containing the offsets which will be applied to the popper
	 */
	function getReferenceOffsets(state, popper, reference) {
	  var commonOffsetParent = findCommonOffsetParent(popper, reference);
	  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent);
	}

	/**
	 * Get the outer sizes of the given element (offset size + margins)
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element
	 * @returns {Object} object containing width and height properties
	 */
	function getOuterSizes(element) {
	  var styles = getComputedStyle(element);
	  var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
	  var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
	  var result = {
	    width: element.offsetWidth + y,
	    height: element.offsetHeight + x
	  };
	  return result;
	}

	/**
	 * Get the opposite placement of the given one
	 * @method
	 * @memberof Popper.Utils
	 * @argument {String} placement
	 * @returns {String} flipped placement
	 */
	function getOppositePlacement(placement) {
	  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
	  return placement.replace(/left|right|bottom|top/g, function (matched) {
	    return hash[matched];
	  });
	}

	/**
	 * Get offsets to the popper
	 * @method
	 * @memberof Popper.Utils
	 * @param {Object} position - CSS position the Popper will get applied
	 * @param {HTMLElement} popper - the popper element
	 * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
	 * @param {String} placement - one of the valid placement options
	 * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
	 */
	function getPopperOffsets(popper, referenceOffsets, placement) {
	  placement = placement.split('-')[0];

	  // Get popper node sizes
	  var popperRect = getOuterSizes(popper);

	  // Add position, width and height to our offsets object
	  var popperOffsets = {
	    width: popperRect.width,
	    height: popperRect.height
	  };

	  // depending by the popper placement we have to compute its offsets slightly differently
	  var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
	  var mainSide = isHoriz ? 'top' : 'left';
	  var secondarySide = isHoriz ? 'left' : 'top';
	  var measurement = isHoriz ? 'height' : 'width';
	  var secondaryMeasurement = !isHoriz ? 'height' : 'width';

	  popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
	  if (placement === secondarySide) {
	    popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
	  } else {
	    popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
	  }

	  return popperOffsets;
	}

	/**
	 * Mimics the `find` method of Array
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Array} arr
	 * @argument prop
	 * @argument value
	 * @returns index or -1
	 */
	function find(arr, check) {
	  // use native find if supported
	  if (Array.prototype.find) {
	    return arr.find(check);
	  }

	  // use `filter` to obtain the same behavior of `find`
	  return arr.filter(check)[0];
	}

	/**
	 * Return the index of the matching object
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Array} arr
	 * @argument prop
	 * @argument value
	 * @returns index or -1
	 */
	function findIndex(arr, prop, value) {
	  // use native findIndex if supported
	  if (Array.prototype.findIndex) {
	    return arr.findIndex(function (cur) {
	      return cur[prop] === value;
	    });
	  }

	  // use `find` + `indexOf` if `findIndex` isn't supported
	  var match = find(arr, function (obj) {
	    return obj[prop] === value;
	  });
	  return arr.indexOf(match);
	}

	/**
	 * Loop trough the list of modifiers and run them in order,
	 * each of them will then edit the data object.
	 * @method
	 * @memberof Popper.Utils
	 * @param {dataObject} data
	 * @param {Array} modifiers
	 * @param {String} ends - Optional modifier name used as stopper
	 * @returns {dataObject}
	 */
	function runModifiers(modifiers, data, ends) {
	  var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

	  modifiersToRun.forEach(function (modifier) {
	    if (modifier['function']) {
	      // eslint-disable-line dot-notation
	      console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
	    }
	    var fn = modifier['function'] || modifier.fn; // eslint-disable-line dot-notation
	    if (modifier.enabled && isFunction(fn)) {
	      // Add properties to offsets to make them a complete clientRect object
	      // we do this before each modifier to make sure the previous one doesn't
	      // mess with these values
	      data.offsets.popper = getClientRect(data.offsets.popper);
	      data.offsets.reference = getClientRect(data.offsets.reference);

	      data = fn(data, modifier);
	    }
	  });

	  return data;
	}

	/**
	 * Updates the position of the popper, computing the new offsets and applying
	 * the new style.<br />
	 * Prefer `scheduleUpdate` over `update` because of performance reasons.
	 * @method
	 * @memberof Popper
	 */
	function update() {
	  // if popper is destroyed, don't perform any further update
	  if (this.state.isDestroyed) {
	    return;
	  }

	  var data = {
	    instance: this,
	    styles: {},
	    arrowStyles: {},
	    attributes: {},
	    flipped: false,
	    offsets: {}
	  };

	  // compute reference element offsets
	  data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference);

	  // compute auto placement, store placement inside the data object,
	  // modifiers will be able to edit `placement` if needed
	  // and refer to originalPlacement to know the original value
	  data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

	  // store the computed placement inside `originalPlacement`
	  data.originalPlacement = data.placement;

	  // compute the popper offsets
	  data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);
	  data.offsets.popper.position = 'absolute';

	  // run the modifiers
	  data = runModifiers(this.modifiers, data);

	  // the first `update` will call `onCreate` callback
	  // the other ones will call `onUpdate` callback
	  if (!this.state.isCreated) {
	    this.state.isCreated = true;
	    this.options.onCreate(data);
	  } else {
	    this.options.onUpdate(data);
	  }
	}

	/**
	 * Helper used to know if the given modifier is enabled.
	 * @method
	 * @memberof Popper.Utils
	 * @returns {Boolean}
	 */
	function isModifierEnabled(modifiers, modifierName) {
	  return modifiers.some(function (_ref) {
	    var name = _ref.name,
	        enabled = _ref.enabled;
	    return enabled && name === modifierName;
	  });
	}

	/**
	 * Get the prefixed supported property name
	 * @method
	 * @memberof Popper.Utils
	 * @argument {String} property (camelCase)
	 * @returns {String} prefixed property (camelCase or PascalCase, depending on the vendor prefix)
	 */
	function getSupportedPropertyName(property) {
	  var prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
	  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

	  for (var i = 0; i < prefixes.length - 1; i++) {
	    var prefix = prefixes[i];
	    var toCheck = prefix ? '' + prefix + upperProp : property;
	    if (typeof document.body.style[toCheck] !== 'undefined') {
	      return toCheck;
	    }
	  }
	  return null;
	}

	/**
	 * Destroy the popper
	 * @method
	 * @memberof Popper
	 */
	function destroy() {
	  this.state.isDestroyed = true;

	  // touch DOM only if `applyStyle` modifier is enabled
	  if (isModifierEnabled(this.modifiers, 'applyStyle')) {
	    this.popper.removeAttribute('x-placement');
	    this.popper.style.left = '';
	    this.popper.style.position = '';
	    this.popper.style.top = '';
	    this.popper.style[getSupportedPropertyName('transform')] = '';
	  }

	  this.disableEventListeners();

	  // remove the popper if user explicity asked for the deletion on destroy
	  // do not use `remove` because IE11 doesn't support it
	  if (this.options.removeOnDestroy) {
	    this.popper.parentNode.removeChild(this.popper);
	  }
	  return this;
	}

	/**
	 * Get the window associated with the element
	 * @argument {Element} element
	 * @returns {Window}
	 */
	function getWindow(element) {
	  var ownerDocument = element.ownerDocument;
	  return ownerDocument ? ownerDocument.defaultView : window;
	}

	function attachToScrollParents(scrollParent, event, callback, scrollParents) {
	  var isBody = scrollParent.nodeName === 'BODY';
	  var target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
	  target.addEventListener(event, callback, { passive: true });

	  if (!isBody) {
	    attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
	  }
	  scrollParents.push(target);
	}

	/**
	 * Setup needed event listeners used to update the popper position
	 * @method
	 * @memberof Popper.Utils
	 * @private
	 */
	function setupEventListeners(reference, options, state, updateBound) {
	  // Resize event listener on window
	  state.updateBound = updateBound;
	  getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

	  // Scroll event listener on scroll parents
	  var scrollElement = getScrollParent(reference);
	  attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
	  state.scrollElement = scrollElement;
	  state.eventsEnabled = true;

	  return state;
	}

	/**
	 * It will add resize/scroll events and start recalculating
	 * position of the popper element when they are triggered.
	 * @method
	 * @memberof Popper
	 */
	function enableEventListeners() {
	  if (!this.state.eventsEnabled) {
	    this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
	  }
	}

	/**
	 * Remove event listeners used to update the popper position
	 * @method
	 * @memberof Popper.Utils
	 * @private
	 */
	function removeEventListeners(reference, state) {
	  // Remove resize event listener on window
	  getWindow(reference).removeEventListener('resize', state.updateBound);

	  // Remove scroll event listener on scroll parents
	  state.scrollParents.forEach(function (target) {
	    target.removeEventListener('scroll', state.updateBound);
	  });

	  // Reset state
	  state.updateBound = null;
	  state.scrollParents = [];
	  state.scrollElement = null;
	  state.eventsEnabled = false;
	  return state;
	}

	/**
	 * It will remove resize/scroll events and won't recalculate popper position
	 * when they are triggered. It also won't trigger onUpdate callback anymore,
	 * unless you call `update` method manually.
	 * @method
	 * @memberof Popper
	 */
	function disableEventListeners() {
	  if (this.state.eventsEnabled) {
	    cancelAnimationFrame(this.scheduleUpdate);
	    this.state = removeEventListeners(this.reference, this.state);
	  }
	}

	/**
	 * Tells if a given input is a number
	 * @method
	 * @memberof Popper.Utils
	 * @param {*} input to check
	 * @return {Boolean}
	 */
	function isNumeric(n) {
	  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
	}

	/**
	 * Set the style to the given popper
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element - Element to apply the style to
	 * @argument {Object} styles
	 * Object with a list of properties and values which will be applied to the element
	 */
	function setStyles(element, styles) {
	  Object.keys(styles).forEach(function (prop) {
	    var unit = '';
	    // add unit if the value is numeric and is one of the following
	    if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
	      unit = 'px';
	    }
	    element.style[prop] = styles[prop] + unit;
	  });
	}

	/**
	 * Set the attributes to the given popper
	 * @method
	 * @memberof Popper.Utils
	 * @argument {Element} element - Element to apply the attributes to
	 * @argument {Object} styles
	 * Object with a list of properties and values which will be applied to the element
	 */
	function setAttributes(element, attributes) {
	  Object.keys(attributes).forEach(function (prop) {
	    var value = attributes[prop];
	    if (value !== false) {
	      element.setAttribute(prop, attributes[prop]);
	    } else {
	      element.removeAttribute(prop);
	    }
	  });
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by `update` method
	 * @argument {Object} data.styles - List of style properties - values to apply to popper element
	 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The same data object
	 */
	function applyStyle(data) {
	  // any property present in `data.styles` will be applied to the popper,
	  // in this way we can make the 3rd party modifiers add custom styles to it
	  // Be aware, modifiers could override the properties defined in the previous
	  // lines of this modifier!
	  setStyles(data.instance.popper, data.styles);

	  // any property present in `data.attributes` will be applied to the popper,
	  // they will be set as HTML attributes of the element
	  setAttributes(data.instance.popper, data.attributes);

	  // if arrowElement is defined and arrowStyles has some properties
	  if (data.arrowElement && Object.keys(data.arrowStyles).length) {
	    setStyles(data.arrowElement, data.arrowStyles);
	  }

	  return data;
	}

	/**
	 * Set the x-placement attribute before everything else because it could be used
	 * to add margins to the popper margins needs to be calculated to get the
	 * correct popper offsets.
	 * @method
	 * @memberof Popper.modifiers
	 * @param {HTMLElement} reference - The reference element used to position the popper
	 * @param {HTMLElement} popper - The HTML element used as popper.
	 * @param {Object} options - Popper.js options
	 */
	function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
	  // compute reference element offsets
	  var referenceOffsets = getReferenceOffsets(state, popper, reference);

	  // compute auto placement, store placement inside the data object,
	  // modifiers will be able to edit `placement` if needed
	  // and refer to originalPlacement to know the original value
	  var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

	  popper.setAttribute('x-placement', placement);

	  // Apply `position` to popper before anything else because
	  // without the position applied we can't guarantee correct computations
	  setStyles(popper, { position: 'absolute' });

	  return options;
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by `update` method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function computeStyle(data, options) {
	  var x = options.x,
	      y = options.y;
	  var popper = data.offsets.popper;

	  // Remove this legacy support in Popper.js v2

	  var legacyGpuAccelerationOption = find(data.instance.modifiers, function (modifier) {
	    return modifier.name === 'applyStyle';
	  }).gpuAcceleration;
	  if (legacyGpuAccelerationOption !== undefined) {
	    console.warn('WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!');
	  }
	  var gpuAcceleration = legacyGpuAccelerationOption !== undefined ? legacyGpuAccelerationOption : options.gpuAcceleration;

	  var offsetParent = getOffsetParent(data.instance.popper);
	  var offsetParentRect = getBoundingClientRect(offsetParent);

	  // Styles
	  var styles = {
	    position: popper.position
	  };

	  // floor sides to avoid blurry text
	  var offsets = {
	    left: Math.floor(popper.left),
	    top: Math.floor(popper.top),
	    bottom: Math.floor(popper.bottom),
	    right: Math.floor(popper.right)
	  };

	  var sideA = x === 'bottom' ? 'top' : 'bottom';
	  var sideB = y === 'right' ? 'left' : 'right';

	  // if gpuAcceleration is set to `true` and transform is supported,
	  //  we use `translate3d` to apply the position to the popper we
	  // automatically use the supported prefixed version if needed
	  var prefixedProperty = getSupportedPropertyName('transform');

	  // now, let's make a step back and look at this code closely (wtf?)
	  // If the content of the popper grows once it's been positioned, it
	  // may happen that the popper gets misplaced because of the new content
	  // overflowing its reference element
	  // To avoid this problem, we provide two options (x and y), which allow
	  // the consumer to define the offset origin.
	  // If we position a popper on top of a reference element, we can set
	  // `x` to `top` to make the popper grow towards its top instead of
	  // its bottom.
	  var left = void 0,
	      top = void 0;
	  if (sideA === 'bottom') {
	    top = -offsetParentRect.height + offsets.bottom;
	  } else {
	    top = offsets.top;
	  }
	  if (sideB === 'right') {
	    left = -offsetParentRect.width + offsets.right;
	  } else {
	    left = offsets.left;
	  }
	  if (gpuAcceleration && prefixedProperty) {
	    styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
	    styles[sideA] = 0;
	    styles[sideB] = 0;
	    styles.willChange = 'transform';
	  } else {
	    // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
	    var invertTop = sideA === 'bottom' ? -1 : 1;
	    var invertLeft = sideB === 'right' ? -1 : 1;
	    styles[sideA] = top * invertTop;
	    styles[sideB] = left * invertLeft;
	    styles.willChange = sideA + ', ' + sideB;
	  }

	  // Attributes
	  var attributes = {
	    'x-placement': data.placement
	  };

	  // Update `data` attributes, styles and arrowStyles
	  data.attributes = _extends$1({}, attributes, data.attributes);
	  data.styles = _extends$1({}, styles, data.styles);
	  data.arrowStyles = _extends$1({}, data.offsets.arrow, data.arrowStyles);

	  return data;
	}

	/**
	 * Helper used to know if the given modifier depends from another one.<br />
	 * It checks if the needed modifier is listed and enabled.
	 * @method
	 * @memberof Popper.Utils
	 * @param {Array} modifiers - list of modifiers
	 * @param {String} requestingName - name of requesting modifier
	 * @param {String} requestedName - name of requested modifier
	 * @returns {Boolean}
	 */
	function isModifierRequired(modifiers, requestingName, requestedName) {
	  var requesting = find(modifiers, function (_ref) {
	    var name = _ref.name;
	    return name === requestingName;
	  });

	  var isRequired = !!requesting && modifiers.some(function (modifier) {
	    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
	  });

	  if (!isRequired) {
	    var _requesting = '`' + requestingName + '`';
	    var requested = '`' + requestedName + '`';
	    console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
	  }
	  return isRequired;
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by update method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function arrow(data, options) {
	  var _data$offsets$arrow;

	  // arrow depends on keepTogether in order to work
	  if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
	    return data;
	  }

	  var arrowElement = options.element;

	  // if arrowElement is a string, suppose it's a CSS selector
	  if (typeof arrowElement === 'string') {
	    arrowElement = data.instance.popper.querySelector(arrowElement);

	    // if arrowElement is not found, don't run the modifier
	    if (!arrowElement) {
	      return data;
	    }
	  } else {
	    // if the arrowElement isn't a query selector we must check that the
	    // provided DOM node is child of its popper node
	    if (!data.instance.popper.contains(arrowElement)) {
	      console.warn('WARNING: `arrow.element` must be child of its popper element!');
	      return data;
	    }
	  }

	  var placement = data.placement.split('-')[0];
	  var _data$offsets = data.offsets,
	      popper = _data$offsets.popper,
	      reference = _data$offsets.reference;

	  var isVertical = ['left', 'right'].indexOf(placement) !== -1;

	  var len = isVertical ? 'height' : 'width';
	  var sideCapitalized = isVertical ? 'Top' : 'Left';
	  var side = sideCapitalized.toLowerCase();
	  var altSide = isVertical ? 'left' : 'top';
	  var opSide = isVertical ? 'bottom' : 'right';
	  var arrowElementSize = getOuterSizes(arrowElement)[len];

	  //
	  // extends keepTogether behavior making sure the popper and its
	  // reference have enough pixels in conjuction
	  //

	  // top/left side
	  if (reference[opSide] - arrowElementSize < popper[side]) {
	    data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
	  }
	  // bottom/right side
	  if (reference[side] + arrowElementSize > popper[opSide]) {
	    data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
	  }
	  data.offsets.popper = getClientRect(data.offsets.popper);

	  // compute center of the popper
	  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

	  // Compute the sideValue using the updated popper offsets
	  // take popper margin in account because we don't have this info available
	  var css = getStyleComputedProperty(data.instance.popper);
	  var popperMarginSide = parseFloat(css['margin' + sideCapitalized], 10);
	  var popperBorderSide = parseFloat(css['border' + sideCapitalized + 'Width'], 10);
	  var sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;

	  // prevent arrowElement from being placed not contiguously to its popper
	  sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

	  data.arrowElement = arrowElement;
	  data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty$1(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty$1(_data$offsets$arrow, altSide, ''), _data$offsets$arrow);

	  return data;
	}

	/**
	 * Get the opposite placement variation of the given one
	 * @method
	 * @memberof Popper.Utils
	 * @argument {String} placement variation
	 * @returns {String} flipped placement variation
	 */
	function getOppositeVariation(variation) {
	  if (variation === 'end') {
	    return 'start';
	  } else if (variation === 'start') {
	    return 'end';
	  }
	  return variation;
	}

	/**
	 * List of accepted placements to use as values of the `placement` option.<br />
	 * Valid placements are:
	 * - `auto`
	 * - `top`
	 * - `right`
	 * - `bottom`
	 * - `left`
	 *
	 * Each placement can have a variation from this list:
	 * - `-start`
	 * - `-end`
	 *
	 * Variations are interpreted easily if you think of them as the left to right
	 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
	 * is right.<br />
	 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
	 *
	 * Some valid examples are:
	 * - `top-end` (on top of reference, right aligned)
	 * - `right-start` (on right of reference, top aligned)
	 * - `bottom` (on bottom, centered)
	 * - `auto-right` (on the side with more space available, alignment depends by placement)
	 *
	 * @static
	 * @type {Array}
	 * @enum {String}
	 * @readonly
	 * @method placements
	 * @memberof Popper
	 */
	var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

	// Get rid of `auto` `auto-start` and `auto-end`
	var validPlacements = placements.slice(3);

	/**
	 * Given an initial placement, returns all the subsequent placements
	 * clockwise (or counter-clockwise).
	 *
	 * @method
	 * @memberof Popper.Utils
	 * @argument {String} placement - A valid placement (it accepts variations)
	 * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
	 * @returns {Array} placements including their variations
	 */
	function clockwise(placement) {
	  var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

	  var index = validPlacements.indexOf(placement);
	  var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
	  return counter ? arr.reverse() : arr;
	}

	var BEHAVIORS = {
	  FLIP: 'flip',
	  CLOCKWISE: 'clockwise',
	  COUNTERCLOCKWISE: 'counterclockwise'
	};

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by update method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function flip(data, options) {
	  // if `inner` modifier is enabled, we can't use the `flip` modifier
	  if (isModifierEnabled(data.instance.modifiers, 'inner')) {
	    return data;
	  }

	  if (data.flipped && data.placement === data.originalPlacement) {
	    // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
	    return data;
	  }

	  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement);

	  var placement = data.placement.split('-')[0];
	  var placementOpposite = getOppositePlacement(placement);
	  var variation = data.placement.split('-')[1] || '';

	  var flipOrder = [];

	  switch (options.behavior) {
	    case BEHAVIORS.FLIP:
	      flipOrder = [placement, placementOpposite];
	      break;
	    case BEHAVIORS.CLOCKWISE:
	      flipOrder = clockwise(placement);
	      break;
	    case BEHAVIORS.COUNTERCLOCKWISE:
	      flipOrder = clockwise(placement, true);
	      break;
	    default:
	      flipOrder = options.behavior;
	  }

	  flipOrder.forEach(function (step, index) {
	    if (placement !== step || flipOrder.length === index + 1) {
	      return data;
	    }

	    placement = data.placement.split('-')[0];
	    placementOpposite = getOppositePlacement(placement);

	    var popperOffsets = data.offsets.popper;
	    var refOffsets = data.offsets.reference;

	    // using floor because the reference offsets may contain decimals we are not going to consider here
	    var floor = Math.floor;
	    var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

	    var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
	    var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
	    var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
	    var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

	    var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

	    // flip the variation if required
	    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
	    var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

	    if (overlapsRef || overflowsBoundaries || flippedVariation) {
	      // this boolean to detect any flip loop
	      data.flipped = true;

	      if (overlapsRef || overflowsBoundaries) {
	        placement = flipOrder[index + 1];
	      }

	      if (flippedVariation) {
	        variation = getOppositeVariation(variation);
	      }

	      data.placement = placement + (variation ? '-' + variation : '');

	      // this object contains `position`, we want to preserve it along with
	      // any additional property we may add in the future
	      data.offsets.popper = _extends$1({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

	      data = runModifiers(data.instance.modifiers, data, 'flip');
	    }
	  });
	  return data;
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by update method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function keepTogether(data) {
	  var _data$offsets = data.offsets,
	      popper = _data$offsets.popper,
	      reference = _data$offsets.reference;

	  var placement = data.placement.split('-')[0];
	  var floor = Math.floor;
	  var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
	  var side = isVertical ? 'right' : 'bottom';
	  var opSide = isVertical ? 'left' : 'top';
	  var measurement = isVertical ? 'width' : 'height';

	  if (popper[side] < floor(reference[opSide])) {
	    data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
	  }
	  if (popper[opSide] > floor(reference[side])) {
	    data.offsets.popper[opSide] = floor(reference[side]);
	  }

	  return data;
	}

	/**
	 * Converts a string containing value + unit into a px value number
	 * @function
	 * @memberof {modifiers~offset}
	 * @private
	 * @argument {String} str - Value + unit string
	 * @argument {String} measurement - `height` or `width`
	 * @argument {Object} popperOffsets
	 * @argument {Object} referenceOffsets
	 * @returns {Number|String}
	 * Value in pixels, or original string if no values were extracted
	 */
	function toValue(str, measurement, popperOffsets, referenceOffsets) {
	  // separate value from unit
	  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
	  var value = +split[1];
	  var unit = split[2];

	  // If it's not a number it's an operator, I guess
	  if (!value) {
	    return str;
	  }

	  if (unit.indexOf('%') === 0) {
	    var element = void 0;
	    switch (unit) {
	      case '%p':
	        element = popperOffsets;
	        break;
	      case '%':
	      case '%r':
	      default:
	        element = referenceOffsets;
	    }

	    var rect = getClientRect(element);
	    return rect[measurement] / 100 * value;
	  } else if (unit === 'vh' || unit === 'vw') {
	    // if is a vh or vw, we calculate the size based on the viewport
	    var size = void 0;
	    if (unit === 'vh') {
	      size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	    } else {
	      size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	    }
	    return size / 100 * value;
	  } else {
	    // if is an explicit pixel unit, we get rid of the unit and keep the value
	    // if is an implicit unit, it's px, and we return just the value
	    return value;
	  }
	}

	/**
	 * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
	 * @function
	 * @memberof {modifiers~offset}
	 * @private
	 * @argument {String} offset
	 * @argument {Object} popperOffsets
	 * @argument {Object} referenceOffsets
	 * @argument {String} basePlacement
	 * @returns {Array} a two cells array with x and y offsets in numbers
	 */
	function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
	  var offsets = [0, 0];

	  // Use height if placement is left or right and index is 0 otherwise use width
	  // in this way the first offset will use an axis and the second one
	  // will use the other one
	  var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

	  // Split the offset string to obtain a list of values and operands
	  // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
	  var fragments = offset.split(/(\+|\-)/).map(function (frag) {
	    return frag.trim();
	  });

	  // Detect if the offset string contains a pair of values or a single one
	  // they could be separated by comma or space
	  var divider = fragments.indexOf(find(fragments, function (frag) {
	    return frag.search(/,|\s/) !== -1;
	  }));

	  if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
	    console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
	  }

	  // If divider is found, we divide the list of values and operands to divide
	  // them by ofset X and Y.
	  var splitRegex = /\s*,\s*|\s+/;
	  var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

	  // Convert the values with units to absolute pixels to allow our computations
	  ops = ops.map(function (op, index) {
	    // Most of the units rely on the orientation of the popper
	    var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
	    var mergeWithPrevious = false;
	    return op
	    // This aggregates any `+` or `-` sign that aren't considered operators
	    // e.g.: 10 + +5 => [10, +, +5]
	    .reduce(function (a, b) {
	      if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
	        a[a.length - 1] = b;
	        mergeWithPrevious = true;
	        return a;
	      } else if (mergeWithPrevious) {
	        a[a.length - 1] += b;
	        mergeWithPrevious = false;
	        return a;
	      } else {
	        return a.concat(b);
	      }
	    }, [])
	    // Here we convert the string values into number values (in px)
	    .map(function (str) {
	      return toValue(str, measurement, popperOffsets, referenceOffsets);
	    });
	  });

	  // Loop trough the offsets arrays and execute the operations
	  ops.forEach(function (op, index) {
	    op.forEach(function (frag, index2) {
	      if (isNumeric(frag)) {
	        offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
	      }
	    });
	  });
	  return offsets;
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by update method
	 * @argument {Object} options - Modifiers configuration and options
	 * @argument {Number|String} options.offset=0
	 * The offset value as described in the modifier description
	 * @returns {Object} The data object, properly modified
	 */
	function offset(data, _ref) {
	  var offset = _ref.offset;
	  var placement = data.placement,
	      _data$offsets = data.offsets,
	      popper = _data$offsets.popper,
	      reference = _data$offsets.reference;

	  var basePlacement = placement.split('-')[0];

	  var offsets = void 0;
	  if (isNumeric(+offset)) {
	    offsets = [+offset, 0];
	  } else {
	    offsets = parseOffset(offset, popper, reference, basePlacement);
	  }

	  if (basePlacement === 'left') {
	    popper.top += offsets[0];
	    popper.left -= offsets[1];
	  } else if (basePlacement === 'right') {
	    popper.top += offsets[0];
	    popper.left += offsets[1];
	  } else if (basePlacement === 'top') {
	    popper.left += offsets[0];
	    popper.top -= offsets[1];
	  } else if (basePlacement === 'bottom') {
	    popper.left += offsets[0];
	    popper.top += offsets[1];
	  }

	  data.popper = popper;
	  return data;
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by `update` method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function preventOverflow(data, options) {
	  var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);

	  // If offsetParent is the reference element, we really want to
	  // go one step up and use the next offsetParent as reference to
	  // avoid to make this modifier completely useless and look like broken
	  if (data.instance.reference === boundariesElement) {
	    boundariesElement = getOffsetParent(boundariesElement);
	  }

	  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement);
	  options.boundaries = boundaries;

	  var order = options.priority;
	  var popper = data.offsets.popper;

	  var check = {
	    primary: function primary(placement) {
	      var value = popper[placement];
	      if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
	        value = Math.max(popper[placement], boundaries[placement]);
	      }
	      return defineProperty$1({}, placement, value);
	    },
	    secondary: function secondary(placement) {
	      var mainSide = placement === 'right' ? 'left' : 'top';
	      var value = popper[mainSide];
	      if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
	        value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
	      }
	      return defineProperty$1({}, mainSide, value);
	    }
	  };

	  order.forEach(function (placement) {
	    var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
	    popper = _extends$1({}, popper, check[side](placement));
	  });

	  data.offsets.popper = popper;

	  return data;
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by `update` method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function shift(data) {
	  var placement = data.placement;
	  var basePlacement = placement.split('-')[0];
	  var shiftvariation = placement.split('-')[1];

	  // if shift shiftvariation is specified, run the modifier
	  if (shiftvariation) {
	    var _data$offsets = data.offsets,
	        reference = _data$offsets.reference,
	        popper = _data$offsets.popper;

	    var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
	    var side = isVertical ? 'left' : 'top';
	    var measurement = isVertical ? 'width' : 'height';

	    var shiftOffsets = {
	      start: defineProperty$1({}, side, reference[side]),
	      end: defineProperty$1({}, side, reference[side] + reference[measurement] - popper[measurement])
	    };

	    data.offsets.popper = _extends$1({}, popper, shiftOffsets[shiftvariation]);
	  }

	  return data;
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by update method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function hide(data) {
	  if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
	    return data;
	  }

	  var refRect = data.offsets.reference;
	  var bound = find(data.instance.modifiers, function (modifier) {
	    return modifier.name === 'preventOverflow';
	  }).boundaries;

	  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
	    // Avoid unnecessary DOM access if visibility hasn't changed
	    if (data.hide === true) {
	      return data;
	    }

	    data.hide = true;
	    data.attributes['x-out-of-boundaries'] = '';
	  } else {
	    // Avoid unnecessary DOM access if visibility hasn't changed
	    if (data.hide === false) {
	      return data;
	    }

	    data.hide = false;
	    data.attributes['x-out-of-boundaries'] = false;
	  }

	  return data;
	}

	/**
	 * @function
	 * @memberof Modifiers
	 * @argument {Object} data - The data object generated by `update` method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {Object} The data object, properly modified
	 */
	function inner(data) {
	  var placement = data.placement;
	  var basePlacement = placement.split('-')[0];
	  var _data$offsets = data.offsets,
	      popper = _data$offsets.popper,
	      reference = _data$offsets.reference;

	  var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

	  var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

	  popper[isHoriz ? 'left' : 'top'] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

	  data.placement = getOppositePlacement(placement);
	  data.offsets.popper = getClientRect(popper);

	  return data;
	}

	/**
	 * Modifier function, each modifier can have a function of this type assigned
	 * to its `fn` property.<br />
	 * These functions will be called on each update, this means that you must
	 * make sure they are performant enough to avoid performance bottlenecks.
	 *
	 * @function ModifierFn
	 * @argument {dataObject} data - The data object generated by `update` method
	 * @argument {Object} options - Modifiers configuration and options
	 * @returns {dataObject} The data object, properly modified
	 */

	/**
	 * Modifiers are plugins used to alter the behavior of your poppers.<br />
	 * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
	 * needed by the library.
	 *
	 * Usually you don't want to override the `order`, `fn` and `onLoad` props.
	 * All the other properties are configurations that could be tweaked.
	 * @namespace modifiers
	 */
	var modifiers = {
	  /**
	   * Modifier used to shift the popper on the start or end of its reference
	   * element.<br />
	   * It will read the variation of the `placement` property.<br />
	   * It can be one either `-end` or `-start`.
	   * @memberof modifiers
	   * @inner
	   */
	  shift: {
	    /** @prop {number} order=100 - Index used to define the order of execution */
	    order: 100,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: shift
	  },

	  /**
	   * The `offset` modifier can shift your popper on both its axis.
	   *
	   * It accepts the following units:
	   * - `px` or unitless, interpreted as pixels
	   * - `%` or `%r`, percentage relative to the length of the reference element
	   * - `%p`, percentage relative to the length of the popper element
	   * - `vw`, CSS viewport width unit
	   * - `vh`, CSS viewport height unit
	   *
	   * For length is intended the main axis relative to the placement of the popper.<br />
	   * This means that if the placement is `top` or `bottom`, the length will be the
	   * `width`. In case of `left` or `right`, it will be the height.
	   *
	   * You can provide a single value (as `Number` or `String`), or a pair of values
	   * as `String` divided by a comma or one (or more) white spaces.<br />
	   * The latter is a deprecated method because it leads to confusion and will be
	   * removed in v2.<br />
	   * Additionally, it accepts additions and subtractions between different units.
	   * Note that multiplications and divisions aren't supported.
	   *
	   * Valid examples are:
	   * ```
	   * 10
	   * '10%'
	   * '10, 10'
	   * '10%, 10'
	   * '10 + 10%'
	   * '10 - 5vh + 3%'
	   * '-10px + 5vh, 5px - 6%'
	   * ```
	   * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
	   * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
	   * > More on this [reading this issue](https://github.com/FezVrasta/popper.js/issues/373)
	   *
	   * @memberof modifiers
	   * @inner
	   */
	  offset: {
	    /** @prop {number} order=200 - Index used to define the order of execution */
	    order: 200,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: offset,
	    /** @prop {Number|String} offset=0
	     * The offset value as described in the modifier description
	     */
	    offset: 0
	  },

	  /**
	   * Modifier used to prevent the popper from being positioned outside the boundary.
	   *
	   * An scenario exists where the reference itself is not within the boundaries.<br />
	   * We can say it has "escaped the boundaries" — or just "escaped".<br />
	   * In this case we need to decide whether the popper should either:
	   *
	   * - detach from the reference and remain "trapped" in the boundaries, or
	   * - if it should ignore the boundary and "escape with its reference"
	   *
	   * When `escapeWithReference` is set to`true` and reference is completely
	   * outside its boundaries, the popper will overflow (or completely leave)
	   * the boundaries in order to remain attached to the edge of the reference.
	   *
	   * @memberof modifiers
	   * @inner
	   */
	  preventOverflow: {
	    /** @prop {number} order=300 - Index used to define the order of execution */
	    order: 300,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: preventOverflow,
	    /**
	     * @prop {Array} [priority=['left','right','top','bottom']]
	     * Popper will try to prevent overflow following these priorities by default,
	     * then, it could overflow on the left and on top of the `boundariesElement`
	     */
	    priority: ['left', 'right', 'top', 'bottom'],
	    /**
	     * @prop {number} padding=5
	     * Amount of pixel used to define a minimum distance between the boundaries
	     * and the popper this makes sure the popper has always a little padding
	     * between the edges of its container
	     */
	    padding: 5,
	    /**
	     * @prop {String|HTMLElement} boundariesElement='scrollParent'
	     * Boundaries used by the modifier, can be `scrollParent`, `window`,
	     * `viewport` or any DOM element.
	     */
	    boundariesElement: 'scrollParent'
	  },

	  /**
	   * Modifier used to make sure the reference and its popper stay near eachothers
	   * without leaving any gap between the two. Expecially useful when the arrow is
	   * enabled and you want to assure it to point to its reference element.
	   * It cares only about the first axis, you can still have poppers with margin
	   * between the popper and its reference element.
	   * @memberof modifiers
	   * @inner
	   */
	  keepTogether: {
	    /** @prop {number} order=400 - Index used to define the order of execution */
	    order: 400,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: keepTogether
	  },

	  /**
	   * This modifier is used to move the `arrowElement` of the popper to make
	   * sure it is positioned between the reference element and its popper element.
	   * It will read the outer size of the `arrowElement` node to detect how many
	   * pixels of conjuction are needed.
	   *
	   * It has no effect if no `arrowElement` is provided.
	   * @memberof modifiers
	   * @inner
	   */
	  arrow: {
	    /** @prop {number} order=500 - Index used to define the order of execution */
	    order: 500,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: arrow,
	    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
	    element: '[x-arrow]'
	  },

	  /**
	   * Modifier used to flip the popper's placement when it starts to overlap its
	   * reference element.
	   *
	   * Requires the `preventOverflow` modifier before it in order to work.
	   *
	   * **NOTE:** this modifier will interrupt the current update cycle and will
	   * restart it if it detects the need to flip the placement.
	   * @memberof modifiers
	   * @inner
	   */
	  flip: {
	    /** @prop {number} order=600 - Index used to define the order of execution */
	    order: 600,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: flip,
	    /**
	     * @prop {String|Array} behavior='flip'
	     * The behavior used to change the popper's placement. It can be one of
	     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
	     * placements (with optional variations).
	     */
	    behavior: 'flip',
	    /**
	     * @prop {number} padding=5
	     * The popper will flip if it hits the edges of the `boundariesElement`
	     */
	    padding: 5,
	    /**
	     * @prop {String|HTMLElement} boundariesElement='viewport'
	     * The element which will define the boundaries of the popper position,
	     * the popper will never be placed outside of the defined boundaries
	     * (except if keepTogether is enabled)
	     */
	    boundariesElement: 'viewport'
	  },

	  /**
	   * Modifier used to make the popper flow toward the inner of the reference element.
	   * By default, when this modifier is disabled, the popper will be placed outside
	   * the reference element.
	   * @memberof modifiers
	   * @inner
	   */
	  inner: {
	    /** @prop {number} order=700 - Index used to define the order of execution */
	    order: 700,
	    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
	    enabled: false,
	    /** @prop {ModifierFn} */
	    fn: inner
	  },

	  /**
	   * Modifier used to hide the popper when its reference element is outside of the
	   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
	   * be used to hide with a CSS selector the popper when its reference is
	   * out of boundaries.
	   *
	   * Requires the `preventOverflow` modifier before it in order to work.
	   * @memberof modifiers
	   * @inner
	   */
	  hide: {
	    /** @prop {number} order=800 - Index used to define the order of execution */
	    order: 800,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: hide
	  },

	  /**
	   * Computes the style that will be applied to the popper element to gets
	   * properly positioned.
	   *
	   * Note that this modifier will not touch the DOM, it just prepares the styles
	   * so that `applyStyle` modifier can apply it. This separation is useful
	   * in case you need to replace `applyStyle` with a custom implementation.
	   *
	   * This modifier has `850` as `order` value to maintain backward compatibility
	   * with previous versions of Popper.js. Expect the modifiers ordering method
	   * to change in future major versions of the library.
	   *
	   * @memberof modifiers
	   * @inner
	   */
	  computeStyle: {
	    /** @prop {number} order=850 - Index used to define the order of execution */
	    order: 850,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: computeStyle,
	    /**
	     * @prop {Boolean} gpuAcceleration=true
	     * If true, it uses the CSS 3d transformation to position the popper.
	     * Otherwise, it will use the `top` and `left` properties.
	     */
	    gpuAcceleration: true,
	    /**
	     * @prop {string} [x='bottom']
	     * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
	     * Change this if your popper should grow in a direction different from `bottom`
	     */
	    x: 'bottom',
	    /**
	     * @prop {string} [x='left']
	     * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
	     * Change this if your popper should grow in a direction different from `right`
	     */
	    y: 'right'
	  },

	  /**
	   * Applies the computed styles to the popper element.
	   *
	   * All the DOM manipulations are limited to this modifier. This is useful in case
	   * you want to integrate Popper.js inside a framework or view library and you
	   * want to delegate all the DOM manipulations to it.
	   *
	   * Note that if you disable this modifier, you must make sure the popper element
	   * has its position set to `absolute` before Popper.js can do its work!
	   *
	   * Just disable this modifier and define you own to achieve the desired effect.
	   *
	   * @memberof modifiers
	   * @inner
	   */
	  applyStyle: {
	    /** @prop {number} order=900 - Index used to define the order of execution */
	    order: 900,
	    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
	    enabled: true,
	    /** @prop {ModifierFn} */
	    fn: applyStyle,
	    /** @prop {Function} */
	    onLoad: applyStyleOnLoad,
	    /**
	     * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
	     * @prop {Boolean} gpuAcceleration=true
	     * If true, it uses the CSS 3d transformation to position the popper.
	     * Otherwise, it will use the `top` and `left` properties.
	     */
	    gpuAcceleration: undefined
	  }
	};

	/**
	 * The `dataObject` is an object containing all the informations used by Popper.js
	 * this object get passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
	 * @name dataObject
	 * @property {Object} data.instance The Popper.js instance
	 * @property {String} data.placement Placement applied to popper
	 * @property {String} data.originalPlacement Placement originally defined on init
	 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
	 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper.
	 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
	 * @property {Object} data.styles Any CSS property defined here will be applied to the popper, it expects the JavaScript nomenclature (eg. `marginBottom`)
	 * @property {Object} data.arrowStyles Any CSS property defined here will be applied to the popper arrow, it expects the JavaScript nomenclature (eg. `marginBottom`)
	 * @property {Object} data.boundaries Offsets of the popper boundaries
	 * @property {Object} data.offsets The measurements of popper, reference and arrow elements.
	 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
	 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
	 * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
	 */

	/**
	 * Default options provided to Popper.js constructor.<br />
	 * These can be overriden using the `options` argument of Popper.js.<br />
	 * To override an option, simply pass as 3rd argument an object with the same
	 * structure of this object, example:
	 * ```
	 * new Popper(ref, pop, {
	 *   modifiers: {
	 *     preventOverflow: { enabled: false }
	 *   }
	 * })
	 * ```
	 * @type {Object}
	 * @static
	 * @memberof Popper
	 */
	var Defaults = {
	  /**
	   * Popper's placement
	   * @prop {Popper.placements} placement='bottom'
	   */
	  placement: 'bottom',

	  /**
	   * Whether events (resize, scroll) are initially enabled
	   * @prop {Boolean} eventsEnabled=true
	   */
	  eventsEnabled: true,

	  /**
	   * Set to true if you want to automatically remove the popper when
	   * you call the `destroy` method.
	   * @prop {Boolean} removeOnDestroy=false
	   */
	  removeOnDestroy: false,

	  /**
	   * Callback called when the popper is created.<br />
	   * By default, is set to no-op.<br />
	   * Access Popper.js instance with `data.instance`.
	   * @prop {onCreate}
	   */
	  onCreate: function onCreate() {},

	  /**
	   * Callback called when the popper is updated, this callback is not called
	   * on the initialization/creation of the popper, but only on subsequent
	   * updates.<br />
	   * By default, is set to no-op.<br />
	   * Access Popper.js instance with `data.instance`.
	   * @prop {onUpdate}
	   */
	  onUpdate: function onUpdate() {},

	  /**
	   * List of modifiers used to modify the offsets before they are applied to the popper.
	   * They provide most of the functionalities of Popper.js
	   * @prop {modifiers}
	   */
	  modifiers: modifiers
	};

	/**
	 * @callback onCreate
	 * @param {dataObject} data
	 */

	/**
	 * @callback onUpdate
	 * @param {dataObject} data
	 */

	// Utils
	// Methods
	var Popper = function () {
	  /**
	   * Create a new Popper.js instance
	   * @class Popper
	   * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
	   * @param {HTMLElement} popper - The HTML element used as popper.
	   * @param {Object} options - Your custom options to override the ones defined in [Defaults](#defaults)
	   * @return {Object} instance - The generated Popper.js instance
	   */
	  function Popper(reference, popper) {
	    var _this = this;

	    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	    classCallCheck$1(this, Popper);

	    this.scheduleUpdate = function () {
	      return requestAnimationFrame(_this.update);
	    };

	    // make update() debounced, so that it only runs at most once-per-tick
	    this.update = debounce(this.update.bind(this));

	    // with {} we create a new object with the options inside it
	    this.options = _extends$1({}, Popper.Defaults, options);

	    // init state
	    this.state = {
	      isDestroyed: false,
	      isCreated: false,
	      scrollParents: []
	    };

	    // get reference and popper elements (allow jQuery wrappers)
	    this.reference = reference && reference.jquery ? reference[0] : reference;
	    this.popper = popper && popper.jquery ? popper[0] : popper;

	    // Deep merge modifiers options
	    this.options.modifiers = {};
	    Object.keys(_extends$1({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
	      _this.options.modifiers[name] = _extends$1({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
	    });

	    // Refactoring modifiers' list (Object => Array)
	    this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
	      return _extends$1({
	        name: name
	      }, _this.options.modifiers[name]);
	    })
	    // sort the modifiers by order
	    .sort(function (a, b) {
	      return a.order - b.order;
	    });

	    // modifiers have the ability to execute arbitrary code when Popper.js get inited
	    // such code is executed in the same order of its modifier
	    // they could add new properties to their options configuration
	    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
	    this.modifiers.forEach(function (modifierOptions) {
	      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
	        modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
	      }
	    });

	    // fire the first update to position the popper in the right place
	    this.update();

	    var eventsEnabled = this.options.eventsEnabled;
	    if (eventsEnabled) {
	      // setup event listeners, they will take care of update the position in specific situations
	      this.enableEventListeners();
	    }

	    this.state.eventsEnabled = eventsEnabled;
	  }

	  // We can't use class properties because they don't get listed in the
	  // class prototype and break stuff like Sinon stubs


	  createClass$1(Popper, [{
	    key: 'update',
	    value: function update$$1() {
	      return update.call(this);
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy$$1() {
	      return destroy.call(this);
	    }
	  }, {
	    key: 'enableEventListeners',
	    value: function enableEventListeners$$1() {
	      return enableEventListeners.call(this);
	    }
	  }, {
	    key: 'disableEventListeners',
	    value: function disableEventListeners$$1() {
	      return disableEventListeners.call(this);
	    }

	    /**
	     * Schedule an update, it will run on the next UI update available
	     * @method scheduleUpdate
	     * @memberof Popper
	     */

	    /**
	     * Collection of utilities useful when writing custom modifiers.
	     * Starting from version 1.7, this method is available only if you
	     * include `popper-utils.js` before `popper.js`.
	     *
	     * **DEPRECATION**: This way to access PopperUtils is deprecated
	     * and will be removed in v2! Use the PopperUtils module directly instead.
	     * Due to the high instability of the methods contained in Utils, we can't
	     * guarantee them to follow semver. Use them at your own risk!
	     * @static
	     * @private
	     * @type {Object}
	     * @deprecated since version 1.8
	     * @member Utils
	     * @memberof Popper
	     */

	  }]);
	  return Popper;
	}();

	/**
	 * The `referenceObject` is an object that provides an interface compatible with Popper.js
	 * and lets you use it as replacement of a real DOM node.<br />
	 * You can use this method to position a popper relatively to a set of coordinates
	 * in case you don't have a DOM node to use as reference.
	 *
	 * ```
	 * new Popper(referenceObject, popperNode);
	 * ```
	 *
	 * NB: This feature isn't supported in Internet Explorer 10
	 * @name referenceObject
	 * @property {Function} data.getBoundingClientRect
	 * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
	 * @property {number} data.clientWidth
	 * An ES6 getter that will return the width of the virtual reference element.
	 * @property {number} data.clientHeight
	 * An ES6 getter that will return the height of the virtual reference element.
	 */

	Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
	Popper.placements = placements;
	Popper.Defaults = Defaults;

	/**
	* Transforms the `arrowTransform` numbers based on the placement axis
	* @param {String} type 'scale' or 'translate'
	* @param {Number[]} numbers
	* @param {Boolean} isVertical
	* @param {Boolean} isReverse
	* @return {String}
	*/
	function transformNumbersBasedOnPlacementAxis(type, numbers, isVertical, isReverse) {
	  if (!numbers.length) return '';

	  var transforms = {
	    scale: function () {
	      if (numbers.length === 1) {
	        return '' + numbers[0];
	      } else {
	        return isVertical ? numbers[0] + ', ' + numbers[1] : numbers[1] + ', ' + numbers[0];
	      }
	    }(),
	    translate: function () {
	      if (numbers.length === 1) {
	        return isReverse ? -numbers[0] + 'px' : numbers[0] + 'px';
	      } else {
	        if (isVertical) {
	          return isReverse ? numbers[0] + 'px, ' + -numbers[1] + 'px' : numbers[0] + 'px, ' + numbers[1] + 'px';
	        } else {
	          return isReverse ? -numbers[1] + 'px, ' + numbers[0] + 'px' : numbers[1] + 'px, ' + numbers[0] + 'px';
	        }
	      }
	    }()
	  };

	  return transforms[type];
	}

	/**
	* Transforms the `arrowTransform` x or y axis based on the placement axis
	* @param {String} axis 'X', 'Y', ''
	* @param {Boolean} isVertical
	* @return {String}
	*/
	function transformAxis(axis, isVertical) {
	  if (!axis) return '';
	  var map = {
	    'X': 'Y',
	    'Y': 'X'
	  };
	  return isVertical ? axis : map[axis];
	}

	/**
	* Returns the core placement ('top', 'bottom', 'left', 'right') of a popper
	* @param {Element} popper
	* @return {String}
	*/
	function getPopperPlacement(popper) {
	  return popper.getAttribute('x-placement').replace(/-.+/, '');
	}

	/**
	* Computes and applies the necessary arrow transform
	* @param {Element} popper
	* @param {Element} arrow
	* @param {String} arrowTransform
	*/
	function computeArrowTransform(popper, arrow, arrowTransform) {
	  var placement = getPopperPlacement(popper);
	  var isVertical = placement === 'top' || placement === 'bottom';
	  var isReverse = placement === 'right' || placement === 'bottom';

	  var getAxis = function getAxis(re) {
	    var match = arrowTransform.match(re);
	    return match ? match[1] : '';
	  };

	  var getNumbers = function getNumbers(re) {
	    var match = arrowTransform.match(re);
	    return match ? match[1].split(',').map(parseFloat) : [];
	  };

	  var re = {
	    translate: /translateX?Y?\(([^)]+)\)/,
	    scale: /scaleX?Y?\(([^)]+)\)/
	  };

	  var matches = {
	    translate: {
	      axis: getAxis(/translate([XY])/),
	      numbers: getNumbers(re.translate)
	    },
	    scale: {
	      axis: getAxis(/scale([XY])/),
	      numbers: getNumbers(re.scale)
	    }
	  };

	  var computedTransform = arrowTransform.replace(re.translate, 'translate' + transformAxis(matches.translate.axis, isVertical) + '(' + transformNumbersBasedOnPlacementAxis('translate', matches.translate.numbers, isVertical, isReverse) + ')').replace(re.scale, 'scale' + transformAxis(matches.scale.axis, isVertical) + '(' + transformNumbersBasedOnPlacementAxis('scale', matches.scale.numbers, isVertical, isReverse) + ')');

	  arrow.style[prefix('transform')] = computedTransform;
	}

	/**
	* Waits until next repaint to execute a fn
	* @param {Function} fn
	*/
	function defer(fn) {
	  requestAnimationFrame(function () {
	    setTimeout(fn, 0);
	  });
	}

	/**
	* Determines if an element is currently visible
	* @param {Element} el
	* @return {Boolean}
	*/
	function isVisible(el) {
	  return el.style.visibility === 'visible';
	}

	/**
	* Returns inner elements of the popper element
	* @param {Element} popper
	* @return {Object}
	*/
	function getInnerElements(popper) {
	  return {
	    tooltip: popper.querySelector(selectors.TOOLTIP),
	    backdrop: popper.querySelector(selectors.BACKDROP),
	    content: popper.querySelector(selectors.CONTENT)
	  };
	}

	/**
	* Returns the distance taking into account the default distance due to
	* the transform: translate setting in CSS
	* @param {Number} distance
	* @return {String}
	*/
	function getOffsetDistanceInPx(distance) {
	  return -(distance - defaults.distance) + 'px';
	}

	/**
	* Adds a mutation observer to an element and stores it in the instance
	* @param {Object}
	*/
	function addMutationObserver(_ref) {
	  var tippy = _ref.tippy,
	      target = _ref.target,
	      callback = _ref.callback,
	      options = _ref.options;

	  if (!window.MutationObserver) return;

	  var observer = new MutationObserver(callback);
	  observer.observe(target, options);
	  tippy._mutationObservers.push(observer);
	}

	/**
	* Creates a new popper instance
	* @param {Tippy} tippy
	* @return {Popper}
	*/
	function createPopperInstance(tippy) {
	  var reference = tippy.reference,
	      popper = tippy.popper,
	      _tippy$options = tippy.options,
	      placement = _tippy$options.placement,
	      popperOptions = _tippy$options.popperOptions,
	      offset = _tippy$options.offset,
	      distance = _tippy$options.distance,
	      updateDuration = _tippy$options.updateDuration,
	      flip = _tippy$options.flip,
	      flipBehavior = _tippy$options.flipBehavior,
	      arrowType = _tippy$options.arrowType,
	      arrowTransform = _tippy$options.arrowTransform;

	  var _getInnerElements = getInnerElements(popper),
	      tooltip = _getInnerElements.tooltip;

	  var arrowSelector = arrowType === 'round' ? selectors.ROUND_ARROW : selectors.ARROW;
	  var arrow = tooltip.querySelector(arrowSelector);

	  var config = _extends({
	    placement: placement
	  }, popperOptions || {}, {
	    modifiers: _extends({}, popperOptions ? popperOptions.modifiers : {}, {
	      arrow: _extends({
	        element: arrowSelector
	      }, popperOptions && popperOptions.modifiers ? popperOptions.modifiers.arrow : {}),
	      flip: _extends({
	        enabled: flip,
	        padding: distance + 5 /* 5px from viewport boundary */
	        , behavior: flipBehavior
	      }, popperOptions && popperOptions.modifiers ? popperOptions.modifiers.flip : {}),
	      offset: _extends({
	        offset: offset
	      }, popperOptions && popperOptions.modifiers ? popperOptions.modifiers.offset : {})
	    }),
	    onCreate: function onCreate() {
	      tooltip.style[getPopperPlacement(popper)] = getOffsetDistanceInPx(distance);

	      if (arrow && arrowTransform) {
	        computeArrowTransform(popper, arrow, arrowTransform);
	      }
	    },
	    onUpdate: function onUpdate() {
	      var styles = tooltip.style;
	      styles.top = '';
	      styles.bottom = '';
	      styles.left = '';
	      styles.right = '';
	      styles[getPopperPlacement(popper)] = getOffsetDistanceInPx(distance);

	      if (arrow && arrowTransform) {
	        computeArrowTransform(popper, arrow, arrowTransform);
	      }
	    }
	  });

	  addMutationObserver({
	    tippy: tippy,
	    target: popper,
	    callback: function callback() {
	      var styles = popper.style;
	      styles[prefix('transitionDuration')] = '0ms';
	      tippy.popperInstance.update();
	      defer(function () {
	        styles[prefix('transitionDuration')] = updateDuration + 'ms';
	      });
	    },

	    options: {
	      childList: true,
	      subtree: true,
	      characterData: true
	    }
	  });

	  return new Popper(reference, popper, config);
	}

	/**
	* Creates a trigger by adding the necessary event listeners to the reference element
	* @param {String} eventType - the custom event specified in the `trigger` setting
	* @param {Element} reference
	* @param {Object} handlers - the handlers for each event
	* @param {Boolean} touchHold
	* @return {Array} - array of listener objects
	*/
	function createTrigger(eventType, reference, handlers, touchHold) {
	  var listeners = [];

	  if (eventType === 'manual') return listeners;

	  // Show
	  reference.addEventListener(eventType, handlers.handleTrigger);
	  listeners.push({
	    event: eventType,
	    handler: handlers.handleTrigger
	  });

	  // Hide
	  if (eventType === 'mouseenter') {
	    if (browser.supportsTouch && touchHold) {
	      reference.addEventListener('touchstart', handlers.handleTrigger);
	      listeners.push({
	        event: 'touchstart',
	        handler: handlers.handleTrigger
	      });
	      reference.addEventListener('touchend', handlers.handleMouseleave);
	      listeners.push({
	        event: 'touchend',
	        handler: handlers.handleMouseleave
	      });
	    }

	    reference.addEventListener('mouseleave', handlers.handleMouseleave);
	    listeners.push({
	      event: 'mouseleave',
	      handler: handlers.handleMouseleave
	    });
	  }

	  if (eventType === 'focus') {
	    reference.addEventListener('blur', handlers.handleBlur);
	    listeners.push({
	      event: 'blur',
	      handler: handlers.handleBlur
	    });
	  }

	  return listeners;
	}

	var matches = {};

	if (isBrowser) {
	  var e = Element.prototype;
	  matches = e.matches || e.matchesSelector || e.webkitMatchesSelector || e.mozMatchesSelector || e.msMatchesSelector || function (s) {
	    var matches = (this.document || this.ownerDocument).querySelectorAll(s);
	    var i = matches.length;
	    while (--i >= 0 && matches.item(i) !== this) {}
	    return i > -1;
	  };
	}

	var matches$1 = matches;

	/**
	* Ponyfill to get the closest parent element
	* @param {Element} element - child of parent to be returned
	* @param {String} parentSelector - selector to match the parent if found
	* @return {Element}
	*/
	function closest(element, parentSelector) {
	  var fn = Element.prototype.closest || function (selector) {
	    var el = this;
	    while (el) {
	      if (matches$1.call(el, selector)) {
	        return el;
	      }
	      el = el.parentElement;
	    }
	  };

	  return fn.call(element, parentSelector);
	}

	/**
	* Determines if the mouse's cursor is outside the interactive border
	* @param {MouseEvent} event
	* @param {Element} popper
	* @param {Object} options
	* @return {Boolean}
	*/
	function cursorIsOutsideInteractiveBorder(event, popper, options) {
	  if (!popper.getAttribute('x-placement')) return true;

	  var x = event.clientX,
	      y = event.clientY;
	  var interactiveBorder = options.interactiveBorder,
	      distance = options.distance;


	  var rect = popper.getBoundingClientRect();
	  var placement = getPopperPlacement(popper);
	  var borderWithDistance = interactiveBorder + distance;

	  var exceeds = {
	    top: rect.top - y > interactiveBorder,
	    bottom: y - rect.bottom > interactiveBorder,
	    left: rect.left - x > interactiveBorder,
	    right: x - rect.right > interactiveBorder
	  };

	  switch (placement) {
	    case 'top':
	      exceeds.top = rect.top - y > borderWithDistance;
	      break;
	    case 'bottom':
	      exceeds.bottom = y - rect.bottom > borderWithDistance;
	      break;
	    case 'left':
	      exceeds.left = rect.left - x > borderWithDistance;
	      break;
	    case 'right':
	      exceeds.right = x - rect.right > borderWithDistance;
	      break;
	  }

	  return exceeds.top || exceeds.bottom || exceeds.left || exceeds.right;
	}

	/**
	* Returns relevant listeners for each Tippy instance
	* @param {Tippy} tippy
	* @param {Object} options
	* @return {Object} of listeners
	*/
	function getEventListeners(tippy, options) {
	  var popper = tippy.popper,
	      reference = tippy.reference,
	      _tippy$options = tippy.options,
	      delay = _tippy$options.delay,
	      duration = _tippy$options.duration,
	      interactive = _tippy$options.interactive,
	      interactiveBorder = _tippy$options.interactiveBorder,
	      hideOnClick = _tippy$options.hideOnClick,
	      trigger = _tippy$options.trigger,
	      touchHold = _tippy$options.touchHold;


	  var showDelay = void 0,
	      hideDelay = void 0;

	  var clearTimeouts = function clearTimeouts() {
	    clearTimeout(showDelay);
	    clearTimeout(hideDelay);
	  };

	  var _show = function _show() {
	    clearTimeouts();

	    if (isVisible(popper)) return;

	    var _delay = Array.isArray(delay) ? delay[0] : delay;

	    if (delay) {
	      showDelay = setTimeout(function () {
	        return tippy.show();
	      }, _delay);
	    } else {
	      tippy.show();
	    }
	  };

	  var show = function show(event) {
	    tippy.options.wait ? tippy.options.wait.call(popper, _show, event) : _show();
	  };

	  var hide = function hide() {
	    clearTimeouts();

	    if (!isVisible(popper)) return;

	    var _delay = Array.isArray(delay) ? delay[1] : delay;

	    if (delay) {
	      hideDelay = setTimeout(function () {
	        if (!isVisible(popper)) return;
	        tippy.hide();
	      }, _delay);
	    } else {
	      tippy.hide();
	    }
	  };

	  var handleTrigger = function handleTrigger(event) {
	    var shouldStopEvent = browser.supportsTouch && browser.usingTouch && (event.type === 'mouseenter' || event.type === 'focus');

	    if (shouldStopEvent && touchHold) return;

	    tippy._lastTriggerEvent = event.type;

	    // Toggle show/hide when clicking click-triggered tooltips
	    var isClick = event.type === 'click';
	    var isNotPersistent = hideOnClick !== 'persistent';

	    isClick && isVisible(popper) && isNotPersistent ? hide() : show(event);

	    // iOS prevents click events from firing
	    if (shouldStopEvent && browser.iOS && reference.click) {
	      reference.click();
	    }
	  };

	  var handleMouseleave = function handleMouseleave(event) {
	    if (event.type === 'mouseleave' && browser.supportsTouch && browser.usingTouch && touchHold) return;

	    if (interactive) {
	      // Temporarily handle mousemove to check if the mouse left somewhere other than the popper
	      var handleMousemove = function handleMousemove(event) {
	        var referenceCursorIsOver = closest(event.target, selectors.REFERENCE);
	        var cursorIsOverPopper = closest(event.target, selectors.POPPER) === popper;
	        var cursorIsOverReference = referenceCursorIsOver === reference;

	        if (cursorIsOverPopper || cursorIsOverReference) return;

	        if (cursorIsOutsideInteractiveBorder(event, popper, options)) {
	          document.body.removeEventListener('mouseleave', hide);
	          document.removeEventListener('mousemove', handleMousemove);
	          hide();
	        }
	      };
	      document.body.addEventListener('mouseleave', hide);
	      document.addEventListener('mousemove', handleMousemove);
	      return;
	    }

	    hide();
	  };

	  var handleBlur = function handleBlur(event) {
	    if (!event.relatedTarget || browser.usingTouch) return;
	    if (closest(event.relatedTarget, selectors.POPPER)) return;
	    hide();
	  };

	  return {
	    handleTrigger: handleTrigger,
	    handleMouseleave: handleMouseleave,
	    handleBlur: handleBlur
	  };
	}

	/**
	* Evaluates/modifies the options object for appropriate behavior
	* @param {Element|Object} reference
	* @param {Object} options
	* @return {Object} modified/evaluated options
	*/
	function evaluateOptions(reference, options) {
	  // animateFill is disabled if an arrow is true
	  if (options.arrow) {
	    options.animateFill = false;
	  }

	  if (options.appendTo && typeof options.appendTo === 'function') {
	    options.appendTo = options.appendTo();
	  }

	  if (typeof options.html === 'function') {
	    options.html = options.html(reference);
	  }

	  return options;
	}

	/**
	* Removes the title from an element, setting `data-original-title`
	* appropriately
	* @param {Element} el
	*/
	function removeTitle(el) {
	  var title = el.getAttribute('title');
	  // Only set `data-original-title` attr if there is a title
	  if (title) {
	    el.setAttribute('data-original-title', title);
	  }
	  el.removeAttribute('title');
	}

	/**
	* Ponyfill for Array.prototype.find
	* @param {Array} arr
	* @param {Function} fn
	* @return item in the array
	*/

	/**
	* Creates a mousemove event listener function for `followCursor` option
	* @param {Tippy} tippy
	* @return {Function} the event listener
	*/
	function createFollowCursorListener(tippy) {
	  var listener = function listener(e) {
	    if (tippy._lastTriggerEvent === 'focus') return;

	    var popper = tippy.popper,
	        offset = tippy.options.offset;


	    var placement = getPopperPlacement(popper);
	    var halfPopperWidth = Math.round(popper.offsetWidth / 2);
	    var halfPopperHeight = Math.round(popper.offsetHeight / 2);
	    var viewportPadding = 5;
	    var pageWidth = document.documentElement.offsetWidth || document.body.offsetWidth;

	    var pageX = e.pageX,
	        pageY = e.pageY;


	    var x = void 0,
	        y = void 0;

	    switch (placement) {
	      case 'top':
	        x = pageX - halfPopperWidth + offset;
	        y = pageY - 2 * halfPopperHeight;
	        break;
	      case 'bottom':
	        x = pageX - halfPopperWidth + offset;
	        y = pageY + 10;
	        break;
	      case 'left':
	        x = pageX - 2 * halfPopperWidth;
	        y = pageY - halfPopperHeight + offset;
	        break;
	      case 'right':
	        x = pageX + 5;
	        y = pageY - halfPopperHeight + offset;
	        break;
	    }

	    var isRightOverflowing = pageX + viewportPadding + halfPopperWidth + offset > pageWidth;
	    var isLeftOverflowing = pageX - viewportPadding - halfPopperWidth + offset < 0;

	    // Prevent left/right overflow
	    if (placement === 'top' || placement === 'bottom') {
	      if (isRightOverflowing) {
	        x = pageWidth - viewportPadding - 2 * halfPopperWidth;
	      }

	      if (isLeftOverflowing) {
	        x = viewportPadding;
	      }
	    }

	    popper.style[prefix('transform')] = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
	  };

	  tippy._followCursorListener = listener;

	  return listener;
	}

	/**
	* Appends the popper and creates a popper instance if one does not exist
	* Also updates its position if need be and enables event listeners
	* @param {Tippy} tippy
	*/
	function mountPopper(tippy) {
	  var popper = tippy.popper,
	      reference = tippy.reference,
	      _tippy$options = tippy.options,
	      appendTo = _tippy$options.appendTo,
	      followCursor = _tippy$options.followCursor;

	  // Already on the DOM

	  if (appendTo.contains(popper)) return;

	  appendTo.appendChild(popper);

	  if (!tippy.popperInstance) {
	    tippy.popperInstance = createPopperInstance(tippy);
	  } else {
	    tippy.popperInstance.update();

	    if (!followCursor || browser.usingTouch) {
	      tippy.popperInstance.enableEventListeners();
	    }
	  }

	  // Since touch is determined dynamically, followCursor is set on mount
	  if (followCursor && !browser.usingTouch) {
	    document.addEventListener('mousemove', createFollowCursorListener(tippy));
	    tippy.popperInstance.disableEventListeners();
	  }
	}

	/**
	* Updates a popper's position on each animation frame to make it stick to a moving element
	* @param {Tippy} tippy
	*/
	function makeSticky(tippy) {
	  var applyTransitionDuration = function applyTransitionDuration() {
	    tippy.popper.style[prefix('transitionDuration')] = tippy.options.updateDuration + 'ms';
	  };

	  var removeTransitionDuration = function removeTransitionDuration() {
	    tippy.popper.style[prefix('transitionDuration')] = '';
	  };

	  var updatePosition = function updatePosition() {
	    tippy.popperInstance && tippy.popperInstance.scheduleUpdate();

	    applyTransitionDuration();

	    isVisible(tippy.popper) ? requestAnimationFrame(updatePosition) : removeTransitionDuration();
	  };

	  // Wait until Popper's position has been updated initially
	  defer(updatePosition);
	}

	/**
	* Prepares the callback functions for `show` and `hide` methods
	* @param {Tippy} tippy
	* @param {Number} duration
	* @param {Function} callback - callback function to fire once transition completes
	*/
	function onTransitionEnd(tippy, duration, callback) {
	  // Make callback synchronous if duration is 0
	  if (!duration) {
	    return callback();
	  }

	  var _getInnerElements = getInnerElements(tippy.popper),
	      tooltip = _getInnerElements.tooltip;

	  var toggleListeners = function toggleListeners(action, listener) {
	    if (!listener) return;
	    tooltip[action + 'EventListener']('webkitTransitionEnd', listener);
	    tooltip[action + 'EventListener']('transitionend', listener);
	  };

	  var listener = function listener(e) {
	    if (e.target === tooltip) {
	      toggleListeners('remove', listener);
	      callback();
	    }
	  };

	  toggleListeners('remove', tippy._transitionendListener);
	  toggleListeners('add', listener);

	  tippy._transitionendListener = listener;
	}

	/**
	* Determines if an element is visible in the viewport
	* @param {Element} el
	* @return {Boolean}
	*/
	function elementIsInViewport(el) {
	  var rect = el.getBoundingClientRect();

	  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
	}

	/**
	* Returns duration taking into account the option being either a number or array
	* @param {Number} duration
	* @param {Number} index
	* @return {Number}
	*/
	function getDuration(duration, index) {
	  return Array.isArray(duration) ? duration[index] : duration;
	}

	/**
	* Sets the visibility state of an element for transition to begin
	* @param {Element[]} els - array of elements
	* @param {String} type - 'visible' or 'hidden'
	*/
	function setVisibilityState(els, type) {
	  els.forEach(function (el) {
	    if (!el) return;
	    el.setAttribute('data-state', type);
	  });
	}

	/**
	* Applies the transition duration to each element
	* @param {Element[]} els - Array of elements
	* @param {Number} duration
	*/
	function applyTransitionDuration(els, duration) {
	  els.forEach(function (el) {
	    if (!el) return;

	    var isContent = matches$1.call(el, selectors.CONTENT);
	    var _duration = isContent ? Math.round(duration / 1.3) : duration;

	    el.style[prefix('transitionDuration')] = _duration + 'ms';
	  });
	}

	var Tippy = function () {
	  function Tippy(config) {
	    classCallCheck(this, Tippy);

	    for (var prop in config) {
	      this[prop] = config[prop];
	    }
	    this.state = {
	      destroyed: false
	    };
	  }

	  /**
	  * Shows the tooltip
	  * @param {Number} duration in milliseconds
	  */


	  createClass(Tippy, [{
	    key: 'show',
	    value: function show(duration) {
	      var _this = this;

	      if (this.state.destroyed) return;

	      var popper = this.popper,
	          reference = this.reference,
	          options = this.options;

	      var _getInnerElements = getInnerElements(popper),
	          tooltip = _getInnerElements.tooltip,
	          backdrop = _getInnerElements.backdrop,
	          content = _getInnerElements.content;

	      // Destroy tooltip if the reference element is no longer on the DOM


	      if (!reference.refObj && !document.body.contains(reference)) {
	        this.destroy();
	        return;
	      }

	      options.onShow.call(popper);

	      duration = getDuration(duration !== undefined ? duration : options.duration, 0);

	      // Prevent a transition when popper changes position
	      applyTransitionDuration([popper, tooltip, backdrop], 0);

	      mountPopper(this);

	      popper.style.visibility = 'visible';
	      popper.setAttribute('aria-hidden', 'false');

	      // Wait for popper's position to update by deferring the callback, so
	      // that the position update doesn't transition, only the normal animation
	      defer(function () {
	        // ~20ms can elapse before this defer callback is run, so the hide() method
	        // may have been invoked -- check if the popper is still visible and cancel
	        // this callback if not
	        if (!isVisible(popper)) return;

	        if (!options.followCursor) {
	          // The arrow is sometimes not in the correct position, so another update after mount is required
	          // May be a bug with Popper.js
	          _this.popperInstance.update();
	          applyTransitionDuration([popper], options.updateDuration);
	        }

	        // Re-apply transition durations
	        applyTransitionDuration([tooltip, backdrop], duration);

	        // Make content fade out a bit faster than the tooltip if `animateFill` is true
	        if (backdrop) {
	          content.style.opacity = 1;
	        }

	        if (options.interactive) {
	          reference.classList.add('tippy-active');
	        }

	        if (options.sticky) {
	          makeSticky(_this);
	        }

	        setVisibilityState([tooltip, backdrop], 'visible');

	        onTransitionEnd(_this, duration, function () {
	          if (isVisible(popper)) {
	            options.interactive && popper.focus();
	            options.onShown.call(popper);
	          }
	        });
	      });
	    }

	    /**
	    * Hides the tooltip
	    * @param {Number} duration in milliseconds
	    */

	  }, {
	    key: 'hide',
	    value: function hide(duration) {
	      var _this2 = this;

	      if (this.state.destroyed) return;

	      var popper = this.popper,
	          reference = this.reference,
	          options = this.options;

	      var _getInnerElements2 = getInnerElements(popper),
	          tooltip = _getInnerElements2.tooltip,
	          backdrop = _getInnerElements2.backdrop,
	          content = _getInnerElements2.content;

	      options.onHide.call(popper);

	      duration = getDuration(duration !== undefined ? duration : options.duration, 1);

	      if (options.interactive) {
	        reference.classList.remove('tippy-active');
	      }

	      popper.style.visibility = 'hidden';
	      popper.setAttribute('aria-hidden', 'true');

	      applyTransitionDuration([tooltip, backdrop, backdrop ? content : null], duration);

	      if (backdrop) {
	        content.style.opacity = 0;
	      }

	      setVisibilityState([tooltip, backdrop], 'hidden');

	      if (options.interactive && options.trigger.indexOf('click') > -1 && elementIsInViewport(reference)) {
	        reference.focus();
	      }

	      onTransitionEnd(this, duration, function () {
	        // `isVisible` is not completely reliable to determine if we shouldn't
	        // run the hidden callback, we need to check the computed opacity style.
	        // This prevents glitchy behavior of the transition when quickly showing
	        // and hiding a tooltip.
	        if (!isVisible(popper) && options.appendTo.contains(popper) && getComputedStyle(tooltip).opacity !== '1') {
	          document.removeEventListener('mousemove', _this2._followCursorListener);
	          _this2.popperInstance.disableEventListeners();
	          options.appendTo.removeChild(popper);

	          options.onHidden.call(popper);
	        }
	      });
	    }

	    /**
	    * Destroys the tooltip
	    */

	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      var _this3 = this;

	      if (this.state.destroyed) return;

	      // Ensure the popper is hidden
	      if (isVisible(this.popper)) {
	        this.hide(0);
	      }

	      this.listeners.forEach(function (listener) {
	        _this3.reference.removeEventListener(listener.event, listener.handler);
	      });

	      // Restore title
	      this.reference.setAttribute('title', this.reference.getAttribute('data-original-title'));

	      delete this.reference._tippy;['data-original-title', 'data-tippy', 'aria-describedby'].forEach(function (attr) {
	        _this3.reference.removeAttribute(attr);
	      });

	      if (this.popperInstance) {
	        this.popperInstance.destroy();
	      }

	      this._mutationObservers.forEach(function (observer) {
	        observer.disconnect();
	      });

	      this.state.destroyed = true;
	    }
	  }]);
	  return Tippy;
	}();

	var idCounter = 1;

	/**
	* Creates tooltips for each reference element
	* @param {Element[]} els
	* @param {Object} config
	* @return {Tippy[]} Array of Tippy instances
	*/
	function createTooltips(els, config) {
	  return els.reduce(function (acc, reference) {
	    var id = idCounter;

	    var options = evaluateOptions(reference, config.performance ? config : getIndividualOptions(reference, config));

	    var html = options.html,
	        trigger = options.trigger,
	        touchHold = options.touchHold,
	        dynamicTitle = options.dynamicTitle,
	        createPopperInstanceOnInit = options.createPopperInstanceOnInit;


	    var title = reference.getAttribute('title');
	    if (!title && !html) return acc;

	    reference.setAttribute('data-tippy', '');
	    reference.setAttribute('aria-describedby', 'tippy-' + id);

	    removeTitle(reference);

	    var popper = createPopperElement(id, title, options);

	    var tippy = new Tippy({
	      id: id,
	      reference: reference,
	      popper: popper,
	      options: options,
	      _mutationObservers: []
	    });

	    tippy.popperInstance = createPopperInstanceOnInit ? createPopperInstance(tippy) : null;

	    var listeners = getEventListeners(tippy, options);
	    tippy.listeners = trigger.trim().split(' ').reduce(function (acc, eventType) {
	      return acc.concat(createTrigger(eventType, reference, listeners, touchHold));
	    }, []);

	    // Update tooltip content whenever the title attribute on the reference changes
	    if (dynamicTitle) {
	      addMutationObserver({
	        tippy: tippy,
	        target: reference,
	        callback: function callback() {
	          var _getInnerElements = getInnerElements(popper),
	              content = _getInnerElements.content;

	          var title = reference.getAttribute('title');
	          if (title) {
	            content.innerHTML = title;
	            removeTitle(reference);
	          }
	        },

	        options: {
	          attributes: true
	        }
	      });
	    }

	    // Shortcuts
	    reference._tippy = tippy;
	    popper._reference = reference;

	    acc.push(tippy);

	    idCounter++;

	    return acc;
	  }, []);
	}

	/**
	* Hides all poppers
	* @param {Tippy} excludeTippy - tippy to exclude if needed
	*/
	function hideAllPoppers(excludeTippy) {
	  var poppers = [].slice.call(document.querySelectorAll(selectors.POPPER));

	  poppers.forEach(function (popper) {
	    var tippy = popper._reference._tippy;
	    var options = tippy.options;


	    if ((options.hideOnClick === true || options.trigger.indexOf('focus') > -1) && (!excludeTippy || popper !== excludeTippy.popper)) {
	      tippy.hide();
	    }
	  });
	}

	/**
	* Adds the needed event listeners
	*/
	function bindEventListeners() {
	  var touchHandler = function touchHandler() {
	    browser.usingTouch = true;

	    if (browser.iOS) {
	      document.body.classList.add('tippy-touch');
	    }

	    if (browser.dynamicInputDetection && window.performance) {
	      document.addEventListener('mousemove', mousemoveHandler);
	    }
	  };

	  var mousemoveHandler = function () {
	    var time = void 0;

	    return function () {
	      var now = performance.now();

	      // Chrome 60+ is 1 mousemove per animation frame, use 20ms time difference
	      if (now - time < 20) {
	        browser.usingTouch = false;
	        document.removeEventListener('mousemove', mousemoveHandler);
	        if (!browser.iOS) {
	          document.body.classList.remove('tippy-touch');
	        }
	      }

	      time = now;
	    };
	  }();

	  var clickHandler = function clickHandler(event) {
	    // Simulated events dispatched on the document
	    if (!(event.target instanceof Element)) {
	      return hideAllPoppers();
	    }

	    var reference = closest(event.target, selectors.REFERENCE);
	    var popper = closest(event.target, selectors.POPPER);

	    if (popper && popper._reference._tippy.options.interactive) return;

	    if (reference) {
	      var options = reference._tippy.options;

	      // Hide all poppers except the one belonging to the element that was clicked IF
	      // `multiple` is false AND they are a touch user, OR
	      // `multiple` is false AND it's triggered by a click

	      if (!options.multiple && browser.usingTouch || !options.multiple && options.trigger.indexOf('click') > -1) {
	        return hideAllPoppers(reference._tippy);
	      }

	      if (options.hideOnClick !== true || options.trigger.indexOf('click') > -1) return;
	    }

	    // Don't needlessly run loop if no poppers are on the document
	    if (!document.querySelector(selectors.POPPER)) return;

	    hideAllPoppers();
	  };

	  var blurHandler = function blurHandler(event) {
	    var _document = document,
	        el = _document.activeElement;

	    if (el && el.blur && matches$1.call(el, selectors.REFERENCE)) {
	      el.blur();
	    }
	  };

	  document.addEventListener('click', clickHandler);
	  document.addEventListener('touchstart', touchHandler);
	  window.addEventListener('blur', blurHandler);

	  if (!browser.supportsTouch && (navigator.maxTouchPoints || navigator.msMaxTouchPoints)) {
	    document.addEventListener('pointerdown', touchHandler);
	  }
	}

	/**
	* Instantiates tooltips
	* @param {String|Element|Element[]|NodeList|Object} selector
	* @param {Object} options
	* @return {Object}
	*/
	function tippy$1(selector, options) {
	  if (browser.supported && !browser.eventsBound) {
	    bindEventListeners();
	    browser.eventsBound = true;
	  }

	  if (isObjectLiteral(selector)) {
	    selector.refObj = true;
	    selector.attributes = selector.attributes || {};
	    selector.setAttribute = function (key, val) {
	      selector.attributes[key] = val;
	    };
	    selector.getAttribute = function (key) {
	      return selector.attributes[key];
	    };
	    selector.removeAttribute = function (key) {
	      delete selector.attributes[key];
	    };
	    selector.addEventListener = function () {};
	    selector.removeEventListener = function () {};
	    selector.classList = {
	      classNames: {},
	      add: function add(key) {
	        return selector.classList.classNames[key] = true;
	      },
	      remove: function remove(key) {
	        delete selector.classList.classNames[key];
	        return true;
	      },
	      contains: function contains(key) {
	        return !!selector.classList.classNames[key];
	      }
	    };
	  }

	  options = _extends({}, defaults, options);

	  return {
	    selector: selector,
	    options: options,
	    tooltips: browser.supported ? createTooltips(getArrayOfElements(selector), options) : [],
	    destroyAll: function destroyAll() {
	      this.tooltips.forEach(function (tooltip) {
	        return tooltip.destroy();
	      });
	    }
	  };
	}

	tippy$1.browser = browser;
	tippy$1.defaults = defaults;

	/**
	* Injects CSS styles to document head
	* @param {String} css
	*/
	function injectCSS() {
	  var css = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

	  if (isBrowser) {
	    var head = document.head || document.querySelector('head');
	    var style = document.createElement('style');
	    style.type = 'text/css';
	    head.insertBefore(style, head.firstChild);

	    if (style.styleSheet) {
	      style.styleSheet.cssText = css;
	    } else {
	      style.appendChild(document.createTextNode(css));
	    }
	  }
	}

	injectCSS(styles);

	return tippy$1;

	})));

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ })
/******/ ]);