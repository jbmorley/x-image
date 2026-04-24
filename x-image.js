class XImage extends HTMLElement {

    constructor() {
        super();
        this.element = null;
        this.selection = null;
        this.sources = [];
    }

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

        this.add(this.children);
    }

    add(nodes) {
        var needsUpdate = false;

        for (const node of nodes) {
            if (node.tagName == "X-SOURCE") {
                this.sources.push({
                    src: node.getAttribute("src"),
                    width: Number(node.getAttribute("width")),
                    height: Number(node.getAttribute("height")),
                });
                needsUpdate = true;
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

    onMutation(mutations) {
        for (const mutation of mutations) {
            this.add(mutation.addedNodes);
        }
    }

    onResize(entries) {
        this.selectSource();
    }

    selectSource() {

        // Check to see if our bounds are non-zero. If they are, we return early and trust
        // that we'll get calld again.
        const bounds = this.getBoundingClientRect();
        if (bounds.width === 0) {
            return;
        }

        const scale = window.devicePixelRatio;
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

function promoteImg(img) {
    if (img.getAttribute("x-srcset") === null) {
        return
    }
    const srcset = img.getAttribute("x-srcset")
    const sources = srcset.split(",").map((source) => {
        const components = source.trim().split(/\s+/);
        return {src: components[0], width: parseInt(components[1]), height: parseInt(components[2])};
    });

    const xImage = document.createElement('x-image');
    xImage.setAttribute("width", img.width);
    xImage.setAttribute("height", img.height);
    img.replaceWith(xImage);
    xImage.add(sources.map((source) => {
        const element = document.createElement('x-source');
        element.setAttribute("src", source.src);
        element.setAttribute("width", source.width);
        element.setAttribute("height", source.height);
        return element;
    }));
}

// Promote img tags with the `x-srcset` attribute to x-image tags.
document.querySelectorAll('img').forEach(img => {
    promoteImg(img);
});


function replaceImages(node) {
    if (node.tagName === 'IMG') {
        promoteImg(node);
    } else if (node.querySelectorAll) {
        node.querySelectorAll('img').forEach(img => {
            promoteImg(img);
        });
    }
}

// Set up the MutationObserver for images.
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => replaceImages(node));
    });
});

// Start observing the document for changes.
observer.observe(document, {
    childList: true,
    subtree: true
});
