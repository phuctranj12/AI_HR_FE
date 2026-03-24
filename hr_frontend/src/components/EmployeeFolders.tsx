
import React, { useState } from "react";
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from 'react-hot-toast';

interface Folder {
  id: number;
  name: string;
}

const initialFolders: Folder[] = [
  { id: 1, name: "Nguyễn Văn A" },
  { id: 2, name: "Trần Thị B" },
];

const EmployeeFolders: React.FC = () => {
  const confirm = useConfirm();
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const handleAddFolder = () => {
    if (newName.trim() === "") return;
    setFolders([
      ...folders,
      { id: Date.now(), name: newName.trim() },
    ]);
    setNewName("");
    setShowAdd(false);
  };

  const [editId, setEditId] = useState<number|null>(null);
  const [editName, setEditName] = useState("");

  const handleEdit = (id: number, name: string) => {
    setEditId(id);
    setEditName(name);
  };

  const handleSaveEdit = () => {
    if (editId === null || editName.trim() === "") return;
    setFolders(folders.map(f => f.id === editId ? { ...f, name: editName.trim() } : f));
    setEditId(null);
    setEditName("");
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm("Bạn có chắc muốn xóa nhân viên này?", { variant: 'destructive', confirmText: 'Xóa' });
    if (ok) {
      setFolders(folders.filter(f => f.id !== id));
      toast.success('Đã xóa nhân viên.');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Danh sách nhân viên</h2>
      {showAdd ? (
        <div className="mb-4 flex items-center space-x-2">
          <input
            className="border px-2 py-1 rounded"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Tên nhân viên"
            autoFocus
          />
          <button
            className="px-3 py-1 bg-green-500 text-white rounded"
            onClick={handleAddFolder}
          >
            Lưu
          </button>
          <button
            className="px-3 py-1 bg-gray-300 rounded"
            onClick={() => { setShowAdd(false); setNewName(""); }}
          >
            Hủy
          </button>
        </div>
      ) : (
        <button
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => setShowAdd(true)}
        >
          Thêm nhân viên
        </button>
      )}
      <ul className="space-y-2">
        {folders.map((folder) => (
          <li key={folder.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
            {editId === folder.id ? (
              <>
                <input
                  className="border px-2 py-1 rounded mr-2"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                />
                <button className="px-2 py-1 bg-green-500 text-white rounded mr-1" onClick={handleSaveEdit}>Lưu</button>
                <button className="px-2 py-1 bg-gray-300 rounded" onClick={handleCancelEdit}>Hủy</button>
              </>
            ) : (
              <>
                <span>{folder.name}</span>
                <div className="space-x-2">
                  <button className="px-2 py-1 bg-yellow-400 rounded" onClick={() => handleEdit(folder.id, folder.name)}>Sửa</button>
                  <button className="px-2 py-1 bg-red-500 text-white rounded" onClick={() => handleDelete(folder.id)}>Xóa</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EmployeeFolders;
