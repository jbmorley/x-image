class XImage extends HTMLElement {

    connectedCallback() {

        if (!this.isConnected) {
            return;
        }

        this.element = null;
        this.selection = null;

        this.width = Number(this.getAttribute("width"));
        this.height = Number(this.getAttribute("height"));
        this.aspectRatio = this.width / this.height;

        this.mutationObserver = new MutationObserver(this.onMutation.bind(this));
        this.mutationObserver.observe(this, {
          childList: true
        });

        function debounce(func, time) {
            var timer;
            return function(event){
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(func, time, event);
            };
        }

        this.resizeObserver = new ResizeObserver(debounce(this.onResize.bind(this), 100));
        this.resizeObserver.observe(this);

        this.sources = [];
    }

    onMutation(mutations) {
        var needsUpdate = false;

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.tagName == "X-SOURCE") {
                    this.sources.push({
                        src: node.getAttribute("src"),
                        width: Number(node.getAttribute("width")),
                        height: Number(node.getAttribute("height")),
                    });
                    needsUpdate = true;
                }
            }
        }

        if (needsUpdate) {

            // Sort the selections by width descending.
            this.sources.sort((a, b) => {
                return b.width - a.width;
            });

            // Select the appropriate size.
            this.selectSource();
        }
    }

    onResize(entries) {
        this.selectSource();
    }

    selectSource() {
        const scale = window.devicePixelRatio;
        const bounds = this.getBoundingClientRect();
        const targetWidth = bounds.width * scale;
        const targetHeight = targetWidth / this.aspectRatio;

        // Don't do anything if there are no sources.
        if (this.sources.length < 1) {
            return;
        }

        // Determine the correct entry.
        var candidate = null
        for (const source of this.sources) {
            if (candidate == null || source.width >= targetWidth) {
                candidate = source
            } else {
                break;
            }
        }

        if (this.selection === candidate) {
            this.element.width = Math.min(bounds.width, candidate.width);
            this.element.height = this.element.width / this.aspectRatio;
            return;
        }

        // Create the new element.
        var element = document.createElement("img");
        element.src = candidate.src;
        element.width = Math.min(bounds.width, candidate.width);
        element.height = element.width / this.aspectRatio;

        // Replace or append as necessary.
        if (this.element == null) {
            this.appendChild(element);
        } else {
            this.element.replaceWith(element);
        }
        this.element = element;
        this.selection = candidate;
    }

    disconnectedCallback() {
        this.mutationObserver.disconnect();
        this.resizeObserver.disconnect();
    }

}

customElements.define('x-image', XImage);
