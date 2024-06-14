import {Controller} from "@hotwired/stimulus"

export default class extends Controller {
    static targets = [
        "crateID",
        "recordID",
        "youtubeID",
    ]

    connect() {
        this.crateId = this.crateIDTarget.value;
        this.recordId = this.recordIDTarget.value;
        this.youtubeID = this.youtubeIDTarget.value;

        // Check if the YT object is already available
        if (window.YT && YT.Player) {
            this.createPlayer(this.youtubeID);
        } else {
            // This function gets called when the API is ready
            window.onYouTubeIframeAPIReady = () => {
                this.createPlayer(this.youtubeID);
            };
        }
    }

    createPlayer(id) {
        this.player = new YT.Player('player', {
            videoId: id,
            events: {
                'onReady': this.onPlayerReady,
                'onStateChange': this.onPlayerStateChange
            }
        });
    }

    onPlayerReady(event) {
        event.target.playVideo();
    }

    onPlayerStateChange(event) {
        // Handle player state changes
    }

    addMark(event) {
        event.preventDefault();
        // make a request to the add mark endpoint with the current time and the record id
        const url = `/crates/${this.crateId}/records/${this.recordId}/marks`;
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.head.querySelector("meta[name=csrf-token]")?.content
            },
            body: JSON.stringify({
                timestamp: this.player.getCurrentTime()
            })
        }).then(response => {
            console.log(response);
        })
    }
}
