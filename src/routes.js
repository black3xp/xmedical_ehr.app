import Index from './Pages/Home/Index.svelte'
import IndexPaciente from './Pages/Paciente/Index.svelte'
import PerfilPaciente from './Pages/Paciente/Perfil.svelte'
import EditarPaciente from './Pages/Paciente/Editar.svelte'
const routes = {
    "/": Index,
    "/Paciente/Index": IndexPaciente,
    "/Paciente/Perfil": PerfilPaciente,
    "/Paciente/Editar": EditarPaciente
}

export default routes;