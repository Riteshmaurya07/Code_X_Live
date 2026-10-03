import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { ACTIONS } from '../../Actions';

export const useYjsMonaco = ({
  socket,
  roomId,
  fileId,
  editor,
  readOnly
}) => {
  const yDocRef = useRef(null);
  const bindingRef = useRef(null);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!socket || !roomId || !fileId || !editor) return;

    // 1. Create a new Y.Doc for this file
    const doc = new Y.Doc();
    yDocRef.current = doc;
    setIsSynced(false);

    // 2. Bind it to Monaco (but maybe wait for sync?)
    // Actually, y-monaco will sync the text model with Yjs.
    const model = editor.getModel();
    if (!model) return;
    
    // We bind after we sync with server to avoid wiping out the server state 
    // with our local empty state, or we can bind now and y-monaco handles it.
    // Better to bind now, it's CRDT. But wait, if model has initial text, y-monaco
    // might treat it as an insertion if Y.Doc is empty. 
    // To be safe, we wait until sync is complete before binding, or we use a separate Y.Text.
    
    const yText = doc.getText('monaco');
    
    // 3. Setup Socket Sync
    const onYjsUpdate = ({ fileId: updateFileId, update }) => {
      if (updateFileId !== fileId) return;
      Y.applyUpdate(doc, new Uint8Array(update));
    };

    const handleLocalUpdate = (update, origin) => {
      // Don't send updates that originated from the server
      if (origin === 'server') return;
      
      socket.emit(ACTIONS.YJS_UPDATE, {
        roomId,
        fileId,
        update: Array.from(update)
      }, (res) => {
        if (res && res.error) {
          console.error("Yjs update rejected:", res.error);
        }
      });
    };

    doc.on('update', handleLocalUpdate);
    socket.on(ACTIONS.YJS_UPDATE, onYjsUpdate);

    // 4. Initial Sync Phase: Request Server Updates
    const sv = Y.encodeStateVector(doc);
    socket.emit(ACTIONS.YJS_SYNC_STEP_2, { roomId, fileId, sv: Array.from(sv) }, (res2) => {
      if (res2 && res2.update) {
        Y.applyUpdate(doc, new Uint8Array(res2.update));
      }
      
      setIsSynced(true);
      
      if (model.getValue() !== yText.toString()) {
         model.setValue(yText.toString());
      }

      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editor]),
        null 
      );
    });

    return () => {
      socket.off(ACTIONS.YJS_UPDATE, onYjsUpdate);
      doc.off('update', handleLocalUpdate);
      
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      doc.destroy();
      yDocRef.current = null;
    };
  }, [socket, roomId, fileId, editor]);

  return { isSynced };
};
