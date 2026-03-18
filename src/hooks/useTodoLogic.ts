import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Todo } from "@/types";
import toast from "react-hot-toast";
import type { Session } from "next-auth";

export function useTodoLogic(session: Session | null, triggerHaptic: () => void) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskProject, setEditTaskProject] = useState("");

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !session?.user?.email) return;
    const { data, error } = await supabase
      .from("todos")
      .insert({
        title: newTaskTitle,
        project: newTaskProject || "一般タスク",
        due_date: newTaskDueDate || null,
        user_email: session.user.email,
      })
      .select()
      .single();

    if (!error && data) {
      setTodos((prev) => [...prev, data as Todo]);
      triggerHaptic();
    } else {
      toast.error("タスクの追加に失敗しました");
    }
    setNewTaskTitle("");
    setNewTaskProject("");
    setNewTaskDueDate("");
    setIsAddingTask(false);
  };

  const openTaskEditModal = (todo: Todo) => {
    setEditingTaskId(todo.id);
    setEditTaskTitle(todo.title);
    setEditTaskProject(todo.project || "");
    setIsTaskEditModalOpen(true);
    triggerHaptic();
  };

  const handleUpdateTask = async () => {
    if (!editingTaskId || !editTaskTitle.trim()) return;
    const { data, error } = await supabase
      .from("todos")
      .update({ title: editTaskTitle, project: editTaskProject || "一般タスク" })
      .eq("id", editingTaskId)
      .select()
      .single();

    if (!error && data) {
      setTodos((prev) => prev.map((t) => (t.id === editingTaskId ? (data as Todo) : t)));
      setIsTaskEditModalOpen(false);
      setEditingTaskId(null);
      triggerHaptic();
    } else {
      toast.error("タスクの更新に失敗しました");
    }
  };

  const handleInlineUpdateTask = async (
    taskId: number,
    title: string,
    project: string,
    dueDate: string
  ) => {
    const { data, error } = await supabase
      .from("todos")
      .update({ title, project: project || "一般タスク", due_date: dueDate || null })
      .eq("id", taskId)
      .select()
      .single();

    if (!error && data) {
      setTodos((prev) => prev.map((t) => (t.id === taskId ? (data as Todo) : t)));
    } else {
      toast.error("タスクの更新に失敗しました");
    }
  };

  const handleDeleteTask = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const previous = [...todos];
    setTodos((prev) => prev.filter((t) => t.id !== taskId));
    triggerHaptic();

    const { error } = await supabase.from("todos").delete().eq("id", taskId);
    if (error) {
      setTodos(previous);
      toast.error("タスクの削除に失敗しました");
    }
  };

  const handleToggleTodo = async (taskId: number, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const previous = [...todos];
    setTodos((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed: !currentStatus } : t))
    );
    triggerHaptic();

    const { data, error } = await supabase
      .from("todos")
      .update({ is_completed: !currentStatus })
      .eq("id", taskId)
      .select()
      .single();

    if (!error && data) {
      setTodos((prev) => prev.map((t) => (t.id === taskId ? (data as Todo) : t)));
    } else {
      setTodos(previous);
      toast.error("タスクの更新に失敗しました");
    }
  };

  return {
    todos,
    setTodos,
    isAddingTask,
    setIsAddingTask,
    newTaskTitle,
    setNewTaskTitle,
    newTaskProject,
    setNewTaskProject,
    newTaskDueDate,
    setNewTaskDueDate,
    isTaskEditModalOpen,
    setIsTaskEditModalOpen,
    editingTaskId,
    setEditingTaskId,
    editTaskTitle,
    setEditTaskTitle,
    editTaskProject,
    setEditTaskProject,
    handleAddTask,
    openTaskEditModal,
    handleUpdateTask,
    handleInlineUpdateTask,
    handleDeleteTask,
    handleToggleTodo,
  };
}
