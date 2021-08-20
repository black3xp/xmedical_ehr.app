<script>
    import Header from "../../Layout/Header.svelte";
    import AsidePaciente from "../../Layout/AsidePacientes.svelte";
    import axios from 'axios';
    import { link } from "svelte-spa-router";
    import {url, calcularEdad} from '../../utils';
    import { onMount } from "svelte";

    let pacientes = [];

    const cargarPacientes = () => {
        const config = {
            method: 'get',
            url: `${url}/pacientes`,
            header: {

            }
        }
        axios(config)
            .then(res => {
                pacientes = res.data
                console.log(pacientes)
            })
            .catch(err => {
                console.error(err)
            })
    }
    onMount(() => {
        cargarPacientes();
    })
</script>

<AsidePaciente />

<main class="admin-main">
  <Header />
  <section class="admin-content p-2">
    <div class="p-2">
      <div class="row" />
      <h4 class="mt-2">Pacientes</h4>
        <div class="row">
            <div class="col-md-12">
                <div class="row">
                    <div class="col-md-5">
                        <div class="input-group input-group-flush mb-3">
                            <input type="search" class="form-control form-control-appended" placeholder="Buscar">
                            <div class="input-group-append">
                                <div class="input-group-text">
                                    <span class="mdi mdi-magnify"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <a href="/Paciente/Editar" use:link type="button" class="btn  m-b-30 ml-2 mr-2 ml-3 btn-primary"><i class="mdi mdi-account-plus"></i> Nuevo paciente
                    </a>
                </div>
            </div>
            <div class="col-md-12 m-b-30">
                <div class="table-responsive">
                    <table class="table align-td-middle table-card">
                        <thead>
                            <tr>
                                <th>Nombres</th>
                                <th>Cedula</th>
                                <th>Edad</th>
                                <th>Sexo</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody data-bind="foreach: pacientes">
                            {#each pacientes as paciente}
                                 <tr>
                                     <td>
                                         <div class="avatar avatar-sm mr-2 d-block-sm">
                                             <div class="avatar avatar-sm">
                                                 <span class="avatar-title rounded-circle ">FD</span>
                                             </div>
         
                                         </div> <span>{paciente.nombres} {paciente.primerApellido} {paciente.segundoApellido}</span>
                                     </td>
                                     <td>{paciente.cedula}</td>
                                     <td>{calcularEdad(paciente.fechaNacimiento)} años</td>
                                     <td>{paciente.sexo == 'M' ? 'Masculino' : 'Femenino'}</td>
         
                                     <td style="text-align: right;">
                                         <div style="width: 200px;" class="ml-auto">
                                             <a href="/Paciente/Editar" use:link data-toggle="tooltip" data-placement="top" data-original-title="Modificar paciente" class="icon-table"><i class="mdi-24px mdi mdi-circle-edit-outline"></i></a>
         
                                             <a href={`/paciente/perfil/${paciente.id}`} use:link data-toggle="tooltip" data-placement="top" data-original-title="Ver perfil" class="icon-table">
                                                 <i class="mdi-24px mdi mdi-account-card-details"></i>
                                             </a>
                                         </div>
                                     </td>
                                 </tr>
                            {/each}
                        </tbody>
                    </table>
    
                </div>
            </div>
        </div>
    </div>
  </section>
</main>