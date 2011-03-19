var Filtr = Class.extend({
    /**
     * Init method
     * @param options (Object) - Options for the method.
     *  Eg.
     *  options: {
     *      //Target element to attach Filtr to
     *      target: document.body,
     *      
     *      //Maximum number of results to display
     *      maxResults: 5,
     *
     *      //If set to true (default), filtr will hide itself when focus is lost
     *      autohide: true,
     *
     *      //Template to build out the results list based on the data
     *      tmpl: '',
     *
     *      refresh: function(value) {
     *          //Method to handle fetching new data
     *          //The value param is the value of the input field
     *      },
     *
     *      onRefreshed: function(resultsList) {
     *          //Method called after refresh operation
     *      },
     *
     *      select: function(data) {
     *          //Method to handle what happens when an item is selected
     *          //The data object contains the values of all the data-attributes
     *      },
     *
     *      onDestroyed: function() {
     *          //Method to handle what happens when destroyed
     *      }
     *      
     *      onSettingsChanged: function(settings) {
     *          //Method to handle what happens when settings are updated
     *      }
     *  }
     */
    init: function(options) {
        var self = this,
        
            target = options.target || document.body,

            element = document.createElement('div'),
            wrapper = document.createElement('div'),
            form = document.createElement('form'),
            settingsBtn = document.createElement('a'),
            field = document.createElement('input'),
            
            autohide = options.autohide == undefined ? true : options.autohide,
            
            resultsList = new Filtr.Results(document.createElement('ul'), {
                select: onSelected, 
                maxResults: options.maxResults || 5,
                tmpl: options.tmpl || ''
            }),
            settings = new Filtr.Settings(document.createElement('form'), {
                change: onSettingsChanged,
                submit: onSettings
            }),

            timer;

        self.element = element;

// PRIVATE METHODS ____________________________________________________________

        function create() {
            addClass(element, 'filtr');
            addClass(wrapper, 'wrapper');
            addClass(form, 'input');
            addClass(settingsBtn, 'settingsBtn');

            element.appendChild(wrapper);

            wrapper.appendChild(form);
            wrapper.appendChild(settings.element);

            form.appendChild(settingsBtn);
            form.appendChild(field);
            form.appendChild(resultsList.element);

            target.insertBefore(element, target.firstChild);
        }

        function addEvents() {
            element.addEventListener('webkitTransitionEnd', onTransitionEnd, false);
            field.addEventListener('keyup', onKeyUp, false);
            field.addEventListener('keydown', onKeyDown, false);
            form.addEventListener('submit', onFormSubmit, false);

            //Bring up the settings window
            settingsBtn.addEventListener('click', onSettings, false);

            //Hide when the window loses focus
            window.addEventListener('blur', onWindowBlur);

            //Hide when clicking outside the window
            window.addEventListener('click', onWindowClick);
        }

        function removeEvents() {
            element.removeEventListener('webkitTransitionEnd', onTransitionEnd);
            field.removeEventListener('keyup', onKeyUp);
            field.removeEventListener('keydown', onKeyDown);
            form.removeEventListener('submit', onFormSubmit);
            settingsBtn.removeEventListener('click', onSettings)

            window.removeEventListener('blur', onWindowBlur);
            window.removeEventListener('click', onWindowClick);
        }

        function destroy() {
            resultsList.destroy();
            element.parentNode.removeChild(element);
            field.value = '';

            removeEvents();

            removeClass(element, 'settings');

            if (options.onDestroyed) {
                options.onDestroyed();
            }
        }


// EVENT HANDLERS _____________________________________________________________

        function onTransitionEnd(e) {
            switch (e.propertyName) {
                case 'opacity':
                    if (hasClass(element, 'in')) {
                        var yScroll = window.scrollY;
                        field.focus();
                        window.scrollTo(window.scrollX, yScroll);
                    }
                    else {
                        destroy();
                    }
                break;
            }
        }

        function onSelected(data) {
            if (autohide) {
                self.hide();
            }
            else {
                field.value = '';
                self.refresh();
            }
            
            if (options.select) {
                options.select.call(null, data);
            }
        }
        
        function onSettingsChanged(newSettings) {
            if (options.onSettingsChanged) {
                options.onSettingsChanged.apply(null, [newSettings]);
            }
        }

        function onKeyDown(e) {
            //Up Arrow or Ctrl + P to go up
            if ((e.keyCode == KEY_UP) || (e.ctrlKey && KEYMAP[e.keyCode].name == 'P')) {
                var curIndex = resultsList.curIndex,
                    items = resultsList.element.querySelectorAll('li'),
                    length = items.length || 0,
                    prev = curIndex - 1 < 0 ? length - 1 : curIndex - 1;

                resultsList.selectResult(items[prev]);
                e.preventDefault();
            }
            
            //Down Arrow or Ctrl + N to go down
            else if (e.keyCode == KEY_DOWN || (e.ctrlKey && KEYMAP[e.keyCode].name == 'N')) {
                var curIndex = resultsList.curIndex,
                    items = resultsList.element.querySelectorAll('li'),
                    length = items.length || 0,
                    next = curIndex + 1 >= length ? 0 : curIndex + 1;

                resultsList.selectResult(items[next]);
                e.preventDefault();
            }
            
            //Esc closes
            else if (e.keyCode == KEY_ESC) {
                self.hide();
            }
        }

        function onKeyUp(e) {
            switch (e.keyCode) {
                //Do nothing
                case KEY_SHIFT:
                case KEY_CTRL:
                case KEY_ALT:
                case KEY_CAPS:
                case KEY_ESC:
                case KEY_END:
                case KEY_HOME:
                case KEY_LEFT:
                case KEY_UP:
                case KEY_RIGHT:
                case KEY_DOWN:
                case KEY_META:
                break;

                //Get results
                default:
                    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                        clearTimeout(timer);
                        timer = setTimeout(function () {
                            if (!field || (!field.value && field.value != '')) {return false;}
                            options.refresh.apply(null, [field.value]);
                        }, 100);
                    }
            }
        }

        function onFormSubmit(e) {
            resultsList.activateResult();
            e.preventDefault();
        }

        function onSettings(e) {
            if (hasClass(element, 'settings')) {
                removeClass(element, 'settings');
            }
            else {
                addClass(element, 'settings');
            }
            
            if (e && e.preventDefault) {
                e.preventDefault();
            }
        }

        function onWindowBlur(e) {
            if (autohide) {
                self.hide();
            }
        }

        function onWindowClick(e) {
            if (autohide && (!hasAncestor(e.target, element) || e.target == element)) {
                self.hide();
            }
        }


// PRIVILEGED METHODS _________________________________________________________

        self.show = function() {
            create();
            addEvents();

            setTimeout(function() {
                addClass(element, 'in');
                field.focus();
            }, 10);
        };

        self.hide = function() {
            self.refresh();
            removeClass(element, 'in');
        };

        self.toggle = function() {
            if (hasClass(element, 'in')) {
                self.hide();
            }
            else {
                self.show();
            }
        }

        self.refresh = function(data) {
            if (!element) {return false;}
            resultsList.refresh(data);

            if (options.onRefreshed) {
                options.onRefreshed(element.clientHeight);
            }
        };
        
        self.updateSettings = function(newSettings) {
            settings.set(newSettings);
        };
        
        self.matchesShortcut = function(e) {
            if (!settings || !settings.get()) {
                return false;
            }
            
            var mods = settings.get().shortcut.modifiers,
                key = settings.get().shortcut.key;
            
            function matchesMods() {
                for (var i = 0, length = mods.length, modKey, matches = true; i < length; i++) {
                    modKey = mods[i].modifier;
                    if (!e[modKey]) {
                        return false;
                    }
                }
                
                return true;
            }
            
            if ( matchesMods() && e.keyCode == key.id) {
                return true;
            }
            
            return false;
        };
        
        
// CONSTRUCTOR ________________________________________________________________
        
        //Sucks to do UA detection, but Chrome won't support webkitBackfaceVisibility
        //until version 11, and this is the easiest way to detect that (no real feature-
        //detection for that CSS property).
        if (BrowserDetect.browser == 'Chrome' && BrowserDetect.version < 11) {
            addClass(element, 'anim2d');
        }
    }
});