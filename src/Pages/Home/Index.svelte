<script>
  import { onMount } from "svelte";
  import OpcionesMenu from '../../componentes/OpcionMenu.svelte'
  //import '../../../node_modules/hover.css/css/hover.css'
  let opciones = [{
    nombre: 'Atencion medica',
    icono: 'mdi mdi-folder-account',
    url: '/AtencionMedica/Atenciones',
    descripcion: 'Hospitalizaciones, Emergencias, etc.'
  },{
    nombre: 'Administracion',
    icono: 'mdi mdi-settings',
    url: '/Usuario/Index',
    descripcion: 'Configuracion de las diferentes opciones'
  },{
    nombre: 'Pacientes',
    icono: 'mdi mdi-account-circle-outline',
    url: '/Paciente/Index',
    descripcion: 'Configuracion de las diferentes opciones'
  }]
  onMount(() => {

  })
</script>
<div class="menu mt-5">
  <h1 class="text-center">Menus</h1>
  <div class="row">
    <div class="col-12 mt-4">
      <div class="row">
        <OpcionesMenu {opciones} />
      </div>
    </div>
  </div>
</div>

<style>
.menu{
    width: 80%;
    margin: 0 auto;
  }
</style>
