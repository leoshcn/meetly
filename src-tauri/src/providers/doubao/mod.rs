pub mod async_client;
pub mod flash_client;
pub mod hotwords;

pub use async_client::{
    poll_until_done, AsyncRecognizer, AsyncSubmitInput, HttpAsyncClient, ASYNC_POLL_INTERVAL,
    ASYNC_POLL_TIMEOUT,
};
pub use flash_client::{
    audio_format_from_path, FlashRecognizeInput, FlashRecognizer, HttpFlashClient,
};

#[cfg(test)]
pub use async_client::{AsyncQueryStatus, AsyncSubmitOutput};
#[cfg(test)]
pub use flash_client::{build_flash_body, FlashRecognizeOutput};
