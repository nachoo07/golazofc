import Swal from 'sweetalert2';
import { toast } from 'sonner';

// 1. ÉXITO (Sonner) - Discreto y rápido
export const showSuccessToast = (title, description) => {
	toast.success(title, {
		description,
		style: {
			background: '#f0fdf4', // Verde clarito estilo Tailwind
			border: '1px solid #4ade80',
			color: '#166534',
			fontSize: '1rem',
			fontWeight: '600'
		}
	});
};

// 2. ERROR (SweetAlert2) - Bloqueante y Claro
export const showErrorAlert = (title, message) => {
	Swal.fire({
		icon: 'error',
		title: title || 'Error',
		text: message || 'Ocurrió un problema inesperado',
		confirmButtonColor: '#d33',
		confirmButtonText: 'Entendido'
	});
};

// 3. CONFIRMACIÓN (SweetAlert2) - Para Borrar
export const showConfirmAlert = async (title, text) => {
	const result = await Swal.fire({
		title: title || '¿Estás seguro?',
		text: text || "No podrás revertir esta acción.",
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: 'Sí, eliminar',
		cancelButtonText: 'Cancelar'
	});

	return result.isConfirmed; // Retorna true o false
};

export default showErrorAlert;
