import React, { useCallback, useMemo, useState } from 'react';
import './MessageInput.css';

const loadAttachment = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        src: typeof reader.result === 'string' ? reader.result : '',
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const MessageInput = ({ onSend }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const hasContent = useMemo(() => Boolean(message.trim()) || attachments.length > 0, [message, attachments.length]);

  const submitMessage = useCallback(async () => {
    if (isSending || !hasContent) {
      return;
    }
    try {
      setIsSending(true);
      await Promise.resolve(
        onSend({
          text: message,
          attachments,
        }),
      );
      setMessage('');
      setAttachments([]);
    } finally {
      setIsSending(false);
    }
  }, [attachments, hasContent, isSending, message, onSend]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      await submitMessage();
    },
    [submitMessage],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (hasContent) {
          submitMessage();
        }
      }
    },
    [hasContent, submitMessage],
  );

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) {
      return;
    }
    const previews = await Promise.all(files.map((file) => loadAttachment(file)));
    setAttachments((previous) => [...previous, ...previews]);
  }, []);

  const handleFileInput = useCallback(
    async (event) => {
      await handleFiles(event.target.files);
      event.target.value = '';
    },
    [handleFiles],
  );

  const handleRemoveAttachment = useCallback((attachmentId) => {
    setAttachments((previous) => previous.filter((attachment) => attachment.id !== attachmentId));
  }, []);

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      {attachments.length > 0 ? (
        <div className="message-input__attachments">
          {attachments.map((attachment) => (
            <div key={attachment.id} className={`message-input__attachment message-input__attachment--${attachment.type}`}>
              {attachment.type === 'image' ? (
                <img src={attachment.src} alt={attachment.name} />
              ) : (
                <div className="message-input__file">
                  <span className="message-input__file-icon" aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 17a2 2 0 0 0 2 2h2" />
                      <path d="M15 3h-8a2 2 0 0 0-2 2v14" />
                      <path d="M9 7h6" />
                      <path d="M9 11h6" />
                    </svg>
                  </span>
                  <div className="message-input__file-meta">
                    <span className="message-input__file-name">{attachment.name}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                className="message-input__remove"
                onClick={() => handleRemoveAttachment(attachment.id)}
                aria-label="Eliminar adjunto"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="message-input__bar">
        <label className="message-input__attach" htmlFor="chat-attachment-input">
          <input
            id="chat-attachment-input"
            className="message-input__file-input"
            onChange={handleFileInput}
            type="file"
            multiple
          />
          <span aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
        </label>

        <textarea
          className="message-input__textarea"
          placeholder="Escribe un mensaje"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <button type="submit" className="message-input__send" disabled={!hasContent || isSending}>
          {isSending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
