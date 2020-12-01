<script>
    import { onMount } from "svelte";
    import { link } from "svelte-spa-router"
    export let opciones = []
    
    onMount(() => {

    })
</script>

{#each opciones as opcion}
    <div class="col-md-4 col-lg-3 p-3 hvr-underline-from-left">
        <a href={opcion.url} use:link style="display:block">
        <div class="icono">
            <i class={opcion.icono}></i>
        </div>
        <div class="info-menu">
        <p>{opcion.nombre}</p>
            <small>{opcion.descripcion}</small>
        </div>
        </a>
    </div>
{/each}

<style>

/* Underline From Left */
.hvr-underline-from-left {
  display: inline-block;
  vertical-align: middle;
  -webkit-transform: perspective(1px) translateZ(0);
  transform: perspective(1px) translateZ(0);
  box-shadow: 0 0 1px rgba(0, 0, 0, 0);
  position: relative;
  overflow: hidden;
}
.hvr-underline-from-left:before {
  content: "";
  position: absolute;
  z-index: -1;
  left: 0;
  right: 100%;
  bottom: 0;
  background: #2098D1;
  height: 4px;
  -webkit-transition-property: right;
  transition-property: right;
  -webkit-transition-duration: 0.3s;
  transition-duration: 0.3s;
  -webkit-transition-timing-function: ease-out;
  transition-timing-function: ease-out;
}
.hvr-underline-from-left:hover:before, .hvr-underline-from-left:focus:before, .hvr-underline-from-left:active:before {
  right: 0;
}
</style>