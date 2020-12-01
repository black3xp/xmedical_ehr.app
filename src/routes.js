import Index from './Pages/Home/Index.svelte'
import IndexPaciente from './Pages/Paciente/Index.svelte'
import PerfilPaciente from './Pages/Paciente/Perfil.svelte'
import EditarPaciente from './Pages/Paciente/Editar.svelte'
import Interconsultas from './Pages/AtencionMedica/Interconsultas.svelte'
import Atenciones from './Pages/AtencionMedica/Atenciones.svelte'
import IndexUsuario from './Pages/Usuario/Index.svelte'
import Error404 from './Pages/Home/Error404.svelte'
const routes = {
    "/": Index,
    "/Paciente/Index": IndexPaciente,
    "/Paciente/Perfil": PerfilPaciente,
    "/Paciente/Editar": EditarPaciente,
    "/AtencionMedica/Interconsultas": Interconsultas,
    "/AtencionMedica/Atenciones": Atenciones,
    "/Usuario/Index": IndexUsuario,
    "*": Error404
}

export default routes;