<script>
  import { onMount } from "svelte";
  import OpcionesMenu from '../../componentes/OpcionMenu.svelte'
  //import '../../../node_modules/hover.css/css/hover.css'
  let opciones = [{
    nombre: 'Atenciones',
    icono: 'mdi mdi-folder-account',
    url: '/Paciente/Index',
    descripcion: 'Atenciones del area de emergencias'
  },{
    nombre: 'Administracion',
    icono: 'mdi mdi-settings',
    url: '/Usuario/Index',
    descripcion: 'Todos los pacientes registrados'
  }]
  onMount(() => {

  })
</script>
<div class="menu mt-5">
  <h1 class="text-center">Menus</h1>
  <div class="row">
    <div class="col-12">
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
