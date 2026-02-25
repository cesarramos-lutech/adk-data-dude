import React, { useRef, useEffect, useState } from 'react';
import {
  Typography, IconButton, Tooltip,
  TextField, InputAdornment, Stack, Chip, Avatar,
} from '@mui/material';
import {
  AttachFile, InsertDriveFile, Send,
  SmartToyOutlined, PersonOutline, ArrowForward,
} from '@mui/icons-material';
import { useSession } from '../context/SessionContext';
import { useStory } from '../context/StoryContext';
import '../App.css';

export interface Message {
  role: 'user' | 'bot';
  text: string;
}

const ChatPanel: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeSessionId, messages, isSending, sendMessage } = useSession();
  const { agentStatus } = useStory();

  const [userInput, setUserInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  const handleSendMessage = async () => {
    if (!userInput.trim() && selectedFiles.length === 0) return;
    if (isSending) return;
    if (!activeSessionId) return;
    await sendMessage(userInput, selectedFiles);
    setUserInput('');
    setSelectedFiles([]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files).map(file => ({
        file,
        name: file.name,
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  return (
    <div className="chat-panel-canvas">
      <div className="chat-panel-canvas-header">
        <Typography className="chat-panel-canvas-title">Chat</Typography>
      </div>

      <div className="chat-panel-canvas-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-canvas-empty">
            <Typography className="chat-canvas-empty-text">
              Ask a question about your data
            </Typography>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`chat-canvas-msg chat-canvas-msg--${msg.role}`}>
              <Avatar className={`chat-canvas-avatar chat-canvas-avatar--${msg.role}`} sx={{ width: 28, height: 28 }}>
                {msg.role === 'bot' ? <SmartToyOutlined sx={{ fontSize: 16 }} /> : <PersonOutline sx={{ fontSize: 16 }} />}
              </Avatar>
              <div className={`chat-canvas-bubble chat-canvas-bubble--${msg.role}`}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                  {msg.text}
                </Typography>
                {msg.role === 'bot' && msg.text && (
                  <div className="chat-canvas-story-link">
                    <ArrowForward sx={{ fontSize: 12 }} />
                    <span>View in story</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {agentStatus !== 'idle' && (
          <div className="chat-canvas-msg chat-canvas-msg--bot">
            <Avatar className="chat-canvas-avatar chat-canvas-avatar--bot" sx={{ width: 28, height: 28 }}>
              <SmartToyOutlined sx={{ fontSize: 16 }} />
            </Avatar>
            <div className="chat-canvas-thinking">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          </div>
        )}
      </div>

      <div className="chat-panel-canvas-input">
        {selectedFiles.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
            {selectedFiles.map((f, i) => (
              <Chip
                key={i}
                label={f.name}
                size="small"
                onDelete={() => handleRemoveFile(i)}
                icon={<InsertDriveFile sx={{ fontSize: 14 }} />}
              />
            ))}
          </Stack>
        )}
        <TextField
          fullWidth
          placeholder={activeSessionId ? 'Ask about your data…' : 'Select a session first'}
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending || !activeSessionId}
          size="small"
          className="chat-canvas-input-field"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={0}>
                  <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} />
                  <Tooltip title="Attach file">
                    <IconButton size="small" onClick={() => fileInputRef.current?.click()} disabled={!activeSessionId}>
                      <AttachFile sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Send">
                    <IconButton
                      size="small"
                      onClick={handleSendMessage}
                      disabled={isSending || !activeSessionId || (!userInput.trim() && selectedFiles.length === 0)}
                      className="chat-send-btn"
                    >
                      <Send sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </InputAdornment>
            ),
          }}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
