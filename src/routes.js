import Index from './Pages/Home/Index.svelte'
import IndexPaciente from './Pages/Paciente/Index.svelte'
import PerfilPaciente from './Pages/Paciente/Perfil.svelte'
import EditarPaciente from './Pages/Paciente/Editar.svelte'
import Interconsultas from './Pages/Home/Interconsultas.svelte'
import IndexUsuario from './Pages/Usuario/Index.svelte'
const routes = {
    "/": Index,
    "/Paciente/Index": IndexPaciente,
    "/Paciente/Perfil": PerfilPaciente,
    "/Paciente/Editar": EditarPaciente,
    "/Home/Interconsultas": Interconsultas,
    "/Usuario/Index": IndexUsuario
}

export default routes;