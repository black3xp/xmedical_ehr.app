<script>
    import Header from "../../Layout/Header.svelte";
    import AsideAdministracion from "../../Layout/AsideAdministracion.svelte";
    import { link } from "svelte-spa-router";
    import ModalCrearUsuarios from '../../componentes/ModalCrearUsuarios.svelte'
    import ModalRolesUsuario from '../../componentes/ModalRolesUsuario.svelte'
</script>

<AsideAdministracion />

<main class="admin-main">
  <Header />
  <section class="admin-content p-2">
    <div class="p-2">
      <div class="row" />
      <h4 class="mt-2">Usuarios</h4>
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
                    <a href="/" data-target="#modalUsuario" data-toggle="modal" use:link type="button" class="btn  m-b-30 ml-2 mr-2 ml-3 btn-primary"><i class="mdi mdi-account-plus"></i> Nuevo usuario
                    </a>
                </div>
            </div>
            <div class="col-md-12 m-b-30">
                <div class="table-responsive">
                    <table class="table align-td-middle table-card">
                        <thead>
                            <tr>
                                <th>Nombres</th>
                                <!-- <th>Usuario</th> -->
                                <th>Correo</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody >
                            <tr>
                                <td>
                                    <div class="avatar avatar-sm mr-2 d-block-sm">
                                        <div class="avatar avatar-sm">
                                            <span class="avatar-title rounded-circle " >A</span>
                                        </div>
    
                                    </div> <span >Alfredo Joel Mena</span>
                                </td>
                                <!-- <td data-bind="text: userName"></td> -->
                                <td >joel.mena@nxt-pro.com</td>
    
                                <td>
                                    <div style="width: 150px; text-align: right;" class="ml-auto">
                                        <!-- <a data-toggle="tooltip" data-placement="top"
                                            data-original-title="Resetear contraseña" class="icon-table"><i
                                                class="mdi-24px mdi mdi-lock-reset"></i></a> -->
                                        <a href="/" data-toggle="modal" style="cursor: pointer;" data-target="#modalUsuario" data-placement="top" data-original-title="Modificar usuario" class="icon-table hover-cursor"><i class=" mdi-24px mdi mdi-circle-edit-outline"></i></a>
                                        <a href="/" data-toggle="modal" data-target="#modalRoles" data-placement="bottom" title="Asignar Roles" class="icon-rol"><i class=" mdi-24px mdi mdi-security"></i></a>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
    
                </div>
            </div>
        </div>
    </div>
  </section>
</main>

<ModalCrearUsuarios />
<ModalRolesUsuario />