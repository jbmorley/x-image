class XImage extends HTMLElement {

    connectedCallback() {

        if (!this.isConnected) {
            return;
        }

        this.element = null;

        this.mutationObserver = new MutationObserver(this.onMutation.bind(this));
        this.mutationObserver.observe(this, {
          childList: true
        });

        this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
        this.resizeObserver.observe(this);

        this.sources = [];
    }

    onMutation(mutations) {
        var needsUpdate = false;

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.tagName == "X-SOURCE") {
                    console.log("Adding source...")
                    this.sources.push({
                        src: node.getAttribute("src"),
                        width: Number(node.getAttribute("width")),
                        height: Number(node.getAttribute("width")),
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
        const bounds = this.getBoundingClientRect();

        // Determine the correct entry.
        var candidate = null
        for (const source of this.sources) {
            if (candidate == null || source.width >= bounds.width) {
                candidate = source
            } else {
                break;
            }
        }

        // Create the new element.
        var element = document.createElement("img");
        element.src = candidate.src;
        element.width = Math.min(bounds.width, candidate.width);

        // Replace or append as necessary.
        if (this.element == null) {
            this.appendChild(element);
        } else {
            this.element.replaceWith(element);
        }
        this.element = element;
    }

    disconnectedCallback() {
        this.mutationObserver.disconnect();
        this.resizeObserver.disconnect();
    }

}

customElements.define('x-image', XImage);
