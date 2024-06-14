import { Controller } from "@hotwired/stimulus";
import { post } from "@rails/request";

export default class extends Controller {
  static targets = ["crateID", "recordID", "youtubeID"];

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
    this.player = new YT.Player("player", {
      videoId: id,
      events: {
        onReady: this.onPlayerReady,
        onStateChange: this.onPlayerStateChange,
      },
    });
  }

  onPlayerReady(event) {
    event.target.playVideo();
  }

  onPlayerStateChange(event) {
    // Handle player state changes
  }

  async addMark(event) {
    event.preventDefault();
    // make a request to the add mark endpoint with the current time
    const url = `/crates/${this.crateId}/records/${this.recordId}/marks`;
    // we use the rails request library to include necessary headers for turbo stream
    const response = await post(url, {
      headers: {
        Accept: "text/vnd.turbo-stream.html, text/html, application/xhtml+xml",
      },
      body: JSON.stringify({
        timestamp: this.player.getCurrentTime(),
      }),
    });
    console.log(response);
  }

  seekTo(event) {
    event.preventDefault();
    this.player.seekTo(event.currentTarget.dataset.timestamp);
  }
}
